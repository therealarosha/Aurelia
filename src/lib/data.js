import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { EVENT_CODE, EVENT_NAME } from './config';
import { buildClaimHash, normalizeAdmission, normalizeEmail, normalizePhone, phoneLast4, randomToken } from './crypto';

function ensureDb() {
  if (!db) throw new Error('Firebase is not configured. Add your values to .env first.');
}

export async function isAuthorizedAdmin(uid) {
  ensureDb();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (error) {
    if (error?.code === 'permission-denied') return false;
    throw error;
  }
}

export async function retrievePublicPass({ admission, email, phone }) {
  ensureDb();
  const claimHash = await buildClaimHash(admission, email, phone);
  const snap = await getDoc(doc(db, 'passClaims', claimHash));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function savePaidStudent(input, adminUser) {
  ensureDb();
  const admissionNumber = String(input.admission || '').trim();
  const studentId = normalizeAdmission(admissionNumber);
  const name = String(input.name || '').trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!studentId || !name || !email || phone.length < 4) {
    throw new Error('Admission number, name, email and phone number are required.');
  }

  const studentRef = doc(db, 'students', studentId);
  const existingSnap = await getDoc(studentRef);
  const existing = existingSnap.exists() ? existingSnap.data() : null;

  const claimHash = await buildClaimHash(admissionNumber, email, phone);
  const qrToken = existing?.qrToken || randomToken(32);
  const qrPayload = `${EVENT_CODE}|v1|${qrToken}`;
  const batch = writeBatch(db);

  if (existing?.claimHash && existing.claimHash !== claimHash) {
    batch.delete(doc(db, 'passClaims', existing.claimHash));
  }
  if (existing?.qrToken && existing.qrToken !== qrToken) {
    batch.delete(doc(db, 'qrTokens', existing.qrToken));
  }

  batch.set(studentRef, {
    admissionNumber,
    admissionNormalized: studentId,
    name,
    email,
    phone,
    phoneLast4: phoneLast4(phone),
    paid: true,
    qrToken,
    claimHash,
    checkedIn: existing?.checkedIn || false,
    checkedInAt: existing?.checkedInAt || null,
    checkedInBy: existing?.checkedInBy || null,
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminUser?.uid || null,
  }, { merge: true });

  batch.set(doc(db, 'passClaims', claimHash), {
    studentId,
    name,
    admissionNumber,
    qrPayload,
    eventCode: EVENT_CODE,
    eventName: EVENT_NAME,
    paid: true,
    checkedIn: existing?.checkedIn || false,
    checkedInAt: existing?.checkedInAt || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  batch.set(doc(db, 'qrTokens', qrToken), {
    studentId,
    eventCode: EVENT_CODE,
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await batch.commit();
  return { studentId, claimHash, qrToken, qrPayload };
}

export async function deleteStudentCompletely(student) {
  ensureDb();
  if (!student?.id) throw new Error('Student record is missing.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'students', student.id));
  if (student.claimHash) batch.delete(doc(db, 'passClaims', student.claimHash));
  if (student.qrToken) batch.delete(doc(db, 'qrTokens', student.qrToken));
  await batch.commit();
}

export function subscribeStudents(onData, onError) {
  ensureDb();
  return onSnapshot(collection(db, 'students'), (snapshot) => {
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    onData(rows);
  }, onError);
}

export function subscribeCheckins(onData, onError, maxRows = 250) {
  ensureDb();
  const q = query(collection(db, 'checkins'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.slice(0, maxRows).map((d) => ({ id: d.id, ...d.data() }));
    onData(rows);
  }, onError);
}

export function parseQrPayload(payload) {
  const text = String(payload || '').trim();
  const prefix = `${EVENT_CODE}|v1|`;
  if (!text.startsWith(prefix)) return null;
  const token = text.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  return token;
}

async function runCheckIn({ token = null, studentId = null, adminUser, method }) {
  ensureDb();
  const logRef = doc(collection(db, 'checkins'));
  return runTransaction(db, async (tx) => {
    let resolvedStudentId = studentId;

    if (token) {
      const tokenRef = doc(db, 'qrTokens', token);
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists()) return { status: 'invalid' };
      resolvedStudentId = tokenSnap.data().studentId;
    }

    if (!resolvedStudentId) return { status: 'invalid' };
    const studentRef = doc(db, 'students', resolvedStudentId);
    const studentSnap = await tx.get(studentRef);
    if (!studentSnap.exists()) return { status: 'invalid' };
    const student = { id: studentSnap.id, ...studentSnap.data() };

    if (!student.paid) return { status: 'unpaid', student };
    if (student.checkedIn) return { status: 'already', student };

    tx.update(studentRef, {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
      checkedInBy: adminUser.uid,
      updatedAt: serverTimestamp(),
    });

    if (student.claimHash) {
      tx.set(doc(db, 'passClaims', student.claimHash), {
        checkedIn: true,
        checkedInAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    tx.set(logRef, {
      eventType: 'checkin',
      method,
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      studentName: student.name,
      adminUid: adminUser.uid,
      adminEmail: adminUser.email || '',
      createdAt: serverTimestamp(),
    });

    return { status: 'approved', student };
  });
}

export async function checkInQrPayload(payload, adminUser) {
  const token = parseQrPayload(payload);
  if (!token) return { status: 'invalid' };
  return runCheckIn({ token, adminUser, method: 'qr' });
}

export async function checkInAdmission(admission, adminUser) {
  const studentId = normalizeAdmission(admission);
  if (!studentId) return { status: 'invalid' };
  return runCheckIn({ studentId, adminUser, method: 'manual' });
}

export async function reverseCheckIn(student, adminUser) {
  ensureDb();
  if (!student?.id) throw new Error('Student record is missing.');
  const studentRef = doc(db, 'students', student.id);
  const logRef = doc(collection(db, 'checkins'));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(studentRef);
    if (!snap.exists()) throw new Error('Student no longer exists.');
    const current = snap.data();
    if (!current.checkedIn) return false;

    tx.update(studentRef, {
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
      updatedAt: serverTimestamp(),
    });
    if (current.claimHash) {
      tx.set(doc(db, 'passClaims', current.claimHash), {
        checkedIn: false,
        checkedInAt: null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
    tx.set(logRef, {
      eventType: 'reversal',
      method: 'admin',
      studentId: student.id,
      admissionNumber: current.admissionNumber,
      studentName: current.name,
      adminUid: adminUser.uid,
      adminEmail: adminUser.email || '',
      createdAt: serverTimestamp(),
    });
    return true;
  });
}

export async function importPaidStudents(rows, adminUser, onProgress = () => {}) {
  const candidates = rows.filter((r) => r.admission && r.name && r.email && r.phone);
  const unique = new Map();
  candidates.forEach((row) => unique.set(normalizeAdmission(row.admission), row));
  const valid = [...unique.values()].filter((row) => normalizeAdmission(row.admission));
  const errors = [];
  let completed = 0;
  const concurrency = 5;

  for (let i = 0; i < valid.length; i += concurrency) {
    const group = valid.slice(i, i + concurrency);
    await Promise.all(group.map(async (row) => {
      try {
        await savePaidStudent(row, adminUser);
      } catch (error) {
        errors.push({ admission: row.admission, error: error.message });
      } finally {
        completed += 1;
        onProgress(completed, valid.length);
      }
    }));
  }
  return { imported: valid.length - errors.length, errors, skipped: rows.length - valid.length };
}
