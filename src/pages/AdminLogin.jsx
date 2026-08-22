import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Brand from '../components/Brand';
import { ConfigNotice, Spinner } from '../components/Ui';
import { auth } from '../lib/firebase';
import { isFirebaseConfigured } from '../lib/config';
import { navigate } from '../App';

export default function AdminLogin({ ready, setToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      setToast({ tone: 'error', title: 'Login failed', message: 'Check the administrator email and password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login page-container">
      <Brand />
      {!isFirebaseConfigured && <ConfigNotice />}
      <section className="glass login-card">
        <div className="lock-mark">◇</div>
        <span className="eyebrow">Restricted access</span>
        <h2>Administrator console</h2>
        <p className="lead">All configured administrator accounts have full access to registrations, check-in, CSV import and attendance logs.</p>
        <form className="form-stack" onSubmit={submit}>
          <label><span>Admin email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></label>
          <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <button className="button button-primary button-large" disabled={loading || !ready || !isFirebaseConfigured}>{loading || !ready ? <><Spinner small /> Signing in…</> : 'Open admin console'}</button>
        </form>
        <button className="text-button center-button" onClick={() => navigate('/')}>← Return to student pass portal</button>
      </section>
    </main>
  );
}
