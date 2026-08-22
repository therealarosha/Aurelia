import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Background from './components/Background';
import { Toast } from './components/Ui';
import PublicPage from './pages/PublicPage';
import AdminLogin from './pages/AdminLogin';
import AdminPanel from './pages/AdminPanel';
import { auth } from './lib/firebase';
import { isAuthorizedAdmin } from './lib/data';

function getRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function navigate(path) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState(getRoute());
  const [user, setUser] = useState(null);
  const [adminReady, setAdminReady] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!auth) { setAdminReady(true); return; }
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setAdminReady(true);
        return;
      }
      setAdminReady(false);
      try {
        const allowed = await isAuthorizedAdmin(nextUser.uid);
        if (!allowed) {
          await signOut(auth);
          setToast({ tone: 'error', title: 'Access denied', message: 'This Firebase account is not registered as an administrator.' });
          setUser(null);
        } else {
          setUser(nextUser);
        }
      } catch (error) {
        setToast({ tone: 'error', title: 'Admin verification failed', message: error.message });
        setUser(null);
      } finally {
        setAdminReady(true);
      }
    });
  }, []);

  const logout = async () => {
    if (auth) await signOut(auth);
    navigate('/admin');
  };

  const isAdminRoute = route.startsWith('/admin');

  return (
    <div className="app-shell">
      <Background />
      {isAdminRoute ? (
        user ? <AdminPanel user={user} route={route} onLogout={logout} setToast={setToast} /> : <AdminLogin ready={adminReady} setToast={setToast} />
      ) : (
        <PublicPage setToast={setToast} />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
