import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { checkInAdmission, checkInQrPayload } from '../lib/data';
import { formatTimestamp } from '../lib/format';
import { soundError, soundSuccess, soundWarning } from '../lib/sound';
import { Spinner } from '../components/Ui';

const defaultState = { status: 'ready', student: null };

export default function AdminScanner({ user, setToast }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ value: '', at: 0 });
  const [cameraState, setCameraState] = useState('starting');
  const [scanState, setScanState] = useState(defaultState);
  const [manual, setManual] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  const announce = useCallback((result) => {
    setScanState(result);
    if (result.status === 'approved') {
      soundSuccess(); navigator.vibrate?.([80, 40, 80]);
    } else if (result.status === 'already' || result.status === 'unpaid') {
      soundWarning(); navigator.vibrate?.(160);
    } else {
      soundError(); navigator.vibrate?.([180, 70, 180]);
    }
    setTimeout(() => setScanState(defaultState), 2600);
  }, []);

  const processPayload = useCallback(async (payload) => {
    const now = Date.now();
    if (processingRef.current) return;
    if (lastScanRef.current.value === payload && now - lastScanRef.current.at < 3500) return;
    processingRef.current = true;
    lastScanRef.current = { value: payload, at: now };
    setScanState({ status: 'checking', student: null });
    try {
      const result = await checkInQrPayload(payload, user);
      announce(result);
    } catch (error) {
      setToast({ tone: 'error', title: 'Check-in error', message: error.message });
      announce({ status: 'invalid', student: null });
    } finally {
      processingRef.current = false;
    }
  }, [announce, setToast, user]);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    const start = async () => {
      try {
        setCameraState('starting');
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current,
          (result) => {
            if (result?.getText) processPayload(result.getText());
          },
        );
        if (cancelled) controls.stop();
        else {
          controlsRef.current = controls;
          setCameraState('ready');
        }
      } catch (error) {
        console.error(error);
        setCameraState('error');
      }
    };
    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
      controlsRef.current = null;
    };
  }, [processPayload]);

  const manualSubmit = async (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    setManualBusy(true);
    try {
      const result = await checkInAdmission(manual, user);
      announce(result);
      if (result.status === 'approved') setManual('');
    } catch (error) {
      setToast({ tone: 'error', title: 'Manual check-in failed', message: error.message });
    } finally {
      setManualBusy(false);
    }
  };

  const resultCopy = {
    approved: ['ENTRY APPROVED', 'This student is checked in.', 'success'],
    already: ['ALREADY CHECKED IN', 'Do not admit as a second entry without verification.', 'warning'],
    unpaid: ['PAYMENT NOT VERIFIED', 'Registration is not marked as paid.', 'danger'],
    invalid: ['INVALID PASS', 'This QR is not recognised for this event.', 'danger'],
    checking: ['VERIFYING…', 'Checking Firebase and one-time entry status.', 'neutral'],
  }[scanState.status];

  return (
    <div className="admin-view scanner-view">
      <div className="view-heading"><div><span className="eyebrow">Gate mode</span><h2>QR check-in scanner</h2></div><span className={`online-chip ${navigator.onLine ? 'online' : 'offline'}`}>● {navigator.onLine ? 'Online' : 'Offline'}</span></div>

      <div className="scanner-grid">
        <section className="glass scanner-card">
          <div className="camera-frame">
            <video ref={videoRef} muted playsInline />
            <div className="scan-corners"><i/><i/><i/><i/></div>
            <div className="scan-line" />
            {cameraState !== 'ready' && <div className="camera-overlay">{cameraState === 'starting' ? <><Spinner /> Starting camera…</> : <>Camera unavailable<br/><small>Use manual admission lookup below.</small></>}</div>}
          </div>
          <p className="helper center">Hold the student's QR inside the frame. Camera access requires HTTPS or localhost.</p>
        </section>

        <section className={`glass scan-result result-${resultCopy?.[2] || 'idle'}`}>
          {resultCopy ? (
            <>
              <div className="result-symbol">{scanState.status === 'approved' ? '✓' : scanState.status === 'checking' ? '◌' : '!'}</div>
              <span className="eyebrow">Gate response</span>
              <h2>{resultCopy[0]}</h2>
              <p>{resultCopy[1]}</p>
              {scanState.student && (
                <div className="student-result">
                  <strong>{scanState.student.name}</strong>
                  <span>{scanState.student.admissionNumber}</span>
                  {scanState.status === 'already' && <small>Previous entry: {formatTimestamp(scanState.student.checkedInAt)}</small>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="result-symbol idle-symbol">◇</div>
              <span className="eyebrow">Ready</span>
              <h2>Waiting for a pass</h2>
              <p>Successful entry appears green. Duplicate and invalid passes remain clearly separated.</p>
            </>
          )}
        </section>
      </div>

      <section className="glass manual-checkin">
        <div><span className="eyebrow">Fallback</span><h3>Manual admission lookup</h3><p>Use this when a phone, QR or camera cannot be used.</p></div>
        <form onSubmit={manualSubmit} className="inline-form">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Admission number" />
          <button className="button button-primary" disabled={manualBusy}>{manualBusy ? <Spinner small /> : 'Verify & check in'}</button>
        </form>
      </section>
    </div>
  );
}
