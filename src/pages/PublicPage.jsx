import { useState } from 'react';
import Brand from '../components/Brand';
import PassCard from '../components/PassCard';
import { ConfigNotice, Spinner } from '../components/Ui';
import { retrievePublicPass } from '../lib/data';
import { ADMISSION_EXAMPLE, EMAIL_EXAMPLE, PHONE_EXAMPLE, isFirebaseConfigured } from '../lib/config';
import { navigate } from '../App';

export default function PublicPage({ setToast }) {
  const [form, setForm] = useState({ admission: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [pass, setPass] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPass(null);
    try {
      const found = await retrievePublicPass(form);
      if (!found) {
        setToast({ tone: 'error', title: 'Pass not found', message: 'The details did not match a paid graduation registration.' });
        return;
      }
      setPass(found);
    } catch (error) {
      setToast({ tone: 'error', title: 'Unable to retrieve pass', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="public-page page-container">
      <Brand />
      {!isFirebaseConfigured && <ConfigNotice />}

      {!pass ? (
        <section className="glass lookup-card">
          <div className="section-icon">✦</div>
          <span className="eyebrow">Secure pass retrieval</span>
          <h2>Get your graduation pass</h2>
          <p className="lead">Enter the same details used for your paid registration. Your QR is generated from a private random token and does not contain your admission number.</p>
          <form onSubmit={submit} className="form-stack">
            <label>
              <span>Admission number</span>
              <input value={form.admission} onChange={(e) => setForm({ ...form, admission: e.target.value })} placeholder={ADMISSION_EXAMPLE} autoComplete="off" required />
            </label>
            <label>
              <span>Email address</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={EMAIL_EXAMPLE} autoComplete="email" required />
            </label>
            <label>
              <span>Phone verification</span>
              <input inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={PHONE_EXAMPLE} autoComplete="tel" minLength={4} required />
              <small>Only the last four digits are used to verify the pass.</small>
            </label>
            <button className="button button-primary button-large" disabled={loading || !isFirebaseConfigured}>
              {loading ? <><Spinner small /> Checking registration…</> : <>Retrieve my pass <span>→</span></>}
            </button>
          </form>
          <div className="trust-row">
            <span>◆ One-time entry</span><span>◆ Payment verified</span><span>◆ Private QR token</span>
          </div>
        </section>
      ) : (
        <div className="public-pass-result">
          <button className="text-button" onClick={() => setPass(null)}>← Retrieve another pass</button>
          <PassCard pass={pass} />
        </div>
      )}

      <footer className="public-footer">
        <span>Graduation Access System</span>
        <button className="text-button muted" onClick={() => navigate('/admin')}>Administrator access</button>
      </footer>
    </main>
  );
}
