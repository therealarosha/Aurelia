import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { deleteStudentCompletely, importPaidStudents, reverseCheckIn, savePaidStudent } from '../lib/data';
import { formatTimestamp } from '../lib/format';
import { Modal, Spinner, StatusPill } from '../components/Ui';

const emptyForm = { admission: '', name: '', email: '', phone: '' };

function canonicalRows(data) {
  return data.map((raw) => {
    const lower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, ''), v]));
    return {
      admission: lower.admission || lower.admissionnumber || lower.studentid || lower.id || '',
      name: lower.name || lower.studentname || lower.fullname || '',
      email: lower.email || lower.emailaddress || '',
      phone: lower.phone || lower.phonenumber || lower.mobile || lower.mobilenumber || '',
    };
  });
}

export default function StudentManager({ students, user, setToast }) {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvName, setCsvName] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) => [s.name, s.admissionNumber, s.email, s.phone].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [search, students]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (student) => {
    setEditing(student);
    setForm({ admission: student.admissionNumber || '', name: student.name || '', email: student.email || '', phone: student.phone || '' });
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePaidStudent(form, user);
      setToast({ tone: 'success', title: editing ? 'Student updated' : 'Paid student added', message: 'The secure QR pass is available immediately.' });
      setFormOpen(false);
    } catch (error) {
      setToast({ tone: 'error', title: 'Could not save student', message: error.message });
    } finally { setSaving(false); }
  };

  const remove = async (student) => {
    if (!window.confirm(`Delete ${student.name} (${student.admissionNumber}) and invalidate their QR pass?`)) return;
    try {
      await deleteStudentCompletely(student);
      setToast({ tone: 'success', title: 'Student deleted', message: 'The associated pass and QR token were invalidated.' });
    } catch (error) { setToast({ tone: 'error', title: 'Delete failed', message: error.message }); }
  };

  const resetCheckIn = async (student) => {
    if (!window.confirm(`Reset the check-in for ${student.name}? This allows their QR to be used again.`)) return;
    try {
      await reverseCheckIn(student, user);
      setToast({ tone: 'success', title: 'Check-in reversed', message: 'The action was recorded in the audit log.' });
    } catch (error) { setToast({ tone: 'error', title: 'Reset failed', message: error.message }); }
  };

  const pickCsv = (file) => {
    if (!file) return;
    setCsvName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => setCsvRows(canonicalRows(results.data)),
      error: (error) => setToast({ tone: 'error', title: 'CSV error', message: error.message }),
    });
  };

  const runImport = async () => {
    setCsvBusy(true); setProgress({ done: 0, total: csvRows.length });
    try {
      const result = await importPaidStudents(csvRows, user, (done, total) => setProgress({ done, total }));
      const msg = `${result.imported} imported${result.skipped ? `, ${result.skipped} skipped` : ''}${result.errors.length ? `, ${result.errors.length} failed` : ''}.`;
      setToast({ tone: result.errors.length ? 'info' : 'success', title: 'CSV import complete', message: msg });
      setCsvOpen(false); setCsvRows([]); setCsvName('');
    } catch (error) { setToast({ tone: 'error', title: 'Import failed', message: error.message }); }
    finally { setCsvBusy(false); }
  };

  return (
    <div className="admin-view">
      <div className="view-heading split-heading">
        <div><span className="eyebrow">Paid registrations</span><h2>Student manager</h2><p>Every record saved here is immediately marked paid and receives a secure QR pass.</p></div>
        <div className="heading-actions"><button className="button button-ghost" onClick={() => setCsvOpen(true)}>Import CSV</button><button className="button button-primary" onClick={openNew}>+ Add paid student</button></div>
      </div>

      <section className="glass table-card">
        <div className="table-toolbar">
          <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, admission, email or phone…" />
          <span>{filtered.length} / {students.length} students</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Student</th><th>Admission</th><th>Contact</th><th>Payment</th><th>Entry</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td className="mono">{s.admissionNumber}</td>
                  <td><div className="contact-cell"><span>{s.email}</span><small>{s.phone}</small></div></td>
                  <td><StatusPill tone="success">Paid</StatusPill></td>
                  <td>{s.checkedIn ? <div><StatusPill tone="warning">Checked in</StatusPill><small className="table-time">{formatTimestamp(s.checkedInAt)}</small></div> : <StatusPill>Not entered</StatusPill>}</td>
                  <td><div className="row-actions"><button onClick={() => openEdit(s)}>Edit</button>{s.checkedIn && <button onClick={() => resetCheckIn(s)}>Reset entry</button>}<button className="danger-link" onClick={() => remove(s)}>Delete</button></div></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="6" className="empty-cell">No matching students.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={formOpen} title={editing ? 'Edit paid student' : 'Add paid student'} onClose={() => !saving && setFormOpen(false)}>
        <form className="form-stack" onSubmit={submit}>
          <label><span>Admission number</span><input value={form.admission} onChange={(e) => setForm({ ...form, admission: e.target.value })} required readOnly={Boolean(editing)} /><small>{editing ? 'Admission number is locked while editing to preserve the record ID.' : 'This becomes the unique student record key.'}</small></label>
          <label><span>Full name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label><span>Phone number</span><input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <div className="paid-confirm">✓ This student will be stored as <strong>PAID</strong> and their QR pass will be generated automatically.</div>
          <button className="button button-primary button-large" disabled={saving}>{saving ? <><Spinner small /> Saving…</> : editing ? 'Save changes' : 'Add paid student & generate pass'}</button>
        </form>
      </Modal>

      <Modal open={csvOpen} title="Import paid students from CSV" onClose={() => !csvBusy && setCsvOpen(false)} wide>
        <div className="csv-guide"><p>Supported headings include <code>admission</code>, <code>name</code>, <code>email</code> and <code>phone</code>. Common variants such as “Admission Number” and “Phone Number” are also detected.</p><a href={`${import.meta.env.BASE_URL}paid-students-sample.csv`} download className="muted">Download the sample CSV (also included under /samples in the ZIP).</a></div>
        <label className="file-drop"><input type="file" accept=".csv,text/csv" onChange={(e) => pickCsv(e.target.files?.[0])} disabled={csvBusy}/><strong>{csvName || 'Choose a CSV file'}</strong><span>{csvRows.length ? `${csvRows.length} rows detected` : 'Click to select your paid-student sheet'}</span></label>
        {csvRows.length > 0 && <div className="csv-preview"><div className="preview-head"><strong>Preview</strong><span>First 5 rows</span></div>{csvRows.slice(0,5).map((r,i)=><div key={i}><span>{r.admission || '—'}</span><span>{r.name || '—'}</span><span>{r.email || '—'}</span><span>{r.phone || '—'}</span></div>)}</div>}
        {csvBusy && <div className="progress-block"><div className="progress-track"><i style={{width:`${progress.total ? (progress.done/progress.total)*100 : 0}%`}}/></div><span>{progress.done} / {progress.total} processed</span></div>}
        <button className="button button-primary button-large" disabled={!csvRows.length || csvBusy} onClick={runImport}>{csvBusy ? <><Spinner small /> Importing…</> : `Import ${csvRows.length || ''} paid students`}</button>
      </Modal>
    </div>
  );
}
