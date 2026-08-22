import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { EVENT_NAME, SCHOOL_NAME } from '../lib/config';
import { formatTimestamp } from '../lib/format';

export default function PassCard({ pass }) {
  const qrRef = useRef(null);

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${pass.admissionNumber || 'graduation'}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="pass-wrap">
      <article className="glass pass-card">
        <div className="pass-sheen" />
        <div className="pass-top">
          <div className="mini-logos">
            <img src={`${import.meta.env.BASE_URL}assets/school-logo.png`} alt="School logo" />
            <img src={`${import.meta.env.BASE_URL}assets/grad-logo.png`} alt="Graduation logo" />
          </div>
          <span className="status-pill status-success">Payment verified</span>
        </div>
        <div className="pass-title">
          <span>Official graduation pass</span>
          <h2>{pass.name}</h2>
          <p>{pass.admissionNumber}</p>
        </div>
        <div className="qr-shell" ref={qrRef}>
          <QRCodeCanvas value={pass.qrPayload} size={230} level="H" marginSize={4} bgColor="#ffffff" fgColor="#061425" />
        </div>
        <div className="pass-status-line">
          {pass.checkedIn ? (
            <><span className="dot dot-amber" /> Used for entry {pass.checkedInAt ? `• ${formatTimestamp(pass.checkedInAt)}` : ''}</>
          ) : (
            <><span className="dot dot-green" /> Valid for one event entry</>
          )}
        </div>
        <div className="pass-footer">
          <div><small>Event</small><strong>{EVENT_NAME}</strong></div>
          <div><small>Issued by</small><strong>{SCHOOL_NAME}</strong></div>
        </div>
      </article>
      <div className="pass-actions">
        <button className="button button-primary" onClick={downloadQr}>Download QR</button>
        <button className="button button-ghost" onClick={() => window.print()}>Print / Save Pass</button>
      </div>
      <p className="helper center">Keep the complete QR visible. A screenshot is also acceptable at the entrance.</p>
    </div>
  );
}
