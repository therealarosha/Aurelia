import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import Brand from '../components/Brand';
import { Spinner, StatusPill } from '../components/Ui';
import { navigate } from '../App';
import { subscribeCheckins, subscribeStudents } from '../lib/data';
import { formatTimestamp } from '../lib/format';
import AdminScanner from './AdminScanner';
import StudentManager from './StudentManager';

function Dashboard({ students, logs }) {
  const checked = students.filter((s) => s.checkedIn).length;
  const remaining = students.length - checked;
  const pct = students.length ? Math.round((checked / students.length) * 100) : 0;
  const recent = logs.filter((x) => x.eventType === 'checkin').slice(0, 8);
  return (
    <div className="admin-view">
      <div className="view-heading"><div><span className="eyebrow">Live event overview</span><h2>Graduation control centre</h2><p>Monitor paid registrations and entrance progress in real time.</p></div></div>
      <div className="stat-grid">
        <div className="glass stat-card"><span>Paid students</span><strong>{students.length}</strong><small>QR passes issued</small></div>
        <div className="glass stat-card"><span>Checked in</span><strong>{checked}</strong><small>{pct}% of paid registrations</small></div>
        <div className="glass stat-card"><span>Remaining</span><strong>{remaining}</strong><small>Still expected</small></div>
      </div>
      <section className="glass progress-card">
        <div className="progress-copy"><div><span className="eyebrow">Entrance progress</span><h3>{pct}% checked in</h3></div><strong>{checked} / {students.length}</strong></div>
        <div className="big-progress"><i style={{ width: `${pct}%` }} /></div>
      </section>
      <div className="dashboard-grid">
        <section className="glass quick-actions"><span className="eyebrow">Event operations</span><h3>Quick actions</h3><button onClick={() => navigate('/admin/scan')} className="quick-action"><b>◇</b><div><strong>Open gate scanner</strong><small>QR + manual check-in</small></div><span>→</span></button><button onClick={() => navigate('/admin/students')} className="quick-action"><b>+</b><div><strong>Add paid student</strong><small>Create registration and pass</small></div><span>→</span></button></section>
        <section className="glass recent-card"><div className="card-title-row"><div><span className="eyebrow">Most recent</span><h3>Check-ins</h3></div><button className="text-button" onClick={() => navigate('/admin/logs')}>View all</button></div>{recent.length ? <div className="recent-list">{recent.map((x)=><div key={x.id}><span className="check-dot">✓</span><div><strong>{x.studentName}</strong><small>{x.admissionNumber}</small></div><time>{formatTimestamp(x.createdAt)}</time></div>)}</div> : <p className="empty-copy">No check-ins recorded yet.</p>}</section>
      </div>
    </div>
  );
}

function Logs({ logs, students }) {
  const exportCsv = () => {
    const data = students.map((s) => ({
      admission: s.admissionNumber,
      name: s.name,
      email: s.email,
      phone: s.phone,
      paid: s.paid ? 'YES' : 'NO',
      checked_in: s.checkedIn ? 'YES' : 'NO',
      checked_in_at: s.checkedInAt?.toDate ? s.checkedInAt.toDate().toISOString() : '',
    }));
    const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'graduation-attendance.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="admin-view">
      <div className="view-heading split-heading"><div><span className="eyebrow">Audit trail</span><h2>Entry history</h2><p>Successful check-ins and administrator reversals are recorded here.</p></div><button className="button button-primary" onClick={exportCsv}>Export attendance CSV</button></div>
      <section className="glass table-card"><div className="table-scroll"><table><thead><tr><th>Time</th><th>Action</th><th>Student</th><th>Admission</th><th>Method</th><th>Admin</th></tr></thead><tbody>{logs.map((x)=><tr key={x.id}><td>{formatTimestamp(x.createdAt)}</td><td><StatusPill tone={x.eventType==='reversal'?'warning':'success'}>{x.eventType==='reversal'?'Reversed':'Checked in'}</StatusPill></td><td><strong>{x.studentName}</strong></td><td className="mono">{x.admissionNumber}</td><td>{x.method}</td><td>{x.adminEmail || x.adminUid}</td></tr>)}{!logs.length&&<tr><td colSpan="6" className="empty-cell">No activity yet.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

export default function AdminPanel({ user, route, onLogout, setToast }) {
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let gotStudents = false, gotLogs = false;
    const done = () => { if (gotStudents && gotLogs) setLoading(false); };
    const unsubStudents = subscribeStudents((rows) => { gotStudents = true; setStudents(rows); done(); }, (e) => setToast({ tone:'error',title:'Student data error',message:e.message }));
    const unsubLogs = subscribeCheckins((rows) => { gotLogs = true; setLogs(rows); done(); }, (e) => setToast({ tone:'error',title:'Log data error',message:e.message }));
    return () => { unsubStudents?.(); unsubLogs?.(); };
  }, [setToast]);

  const active = useMemo(() => {
    if (route.includes('/scan')) return 'scan';
    if (route.includes('/students')) return 'students';
    if (route.includes('/logs')) return 'logs';
    return 'dashboard';
  }, [route]);

  const content = loading ? <div className="admin-loader"><Spinner/><span>Loading graduation data…</span></div> : active === 'scan' ? <AdminScanner user={user} setToast={setToast}/> : active === 'students' ? <StudentManager students={students} user={user} setToast={setToast}/> : active === 'logs' ? <Logs logs={logs} students={students}/> : <Dashboard students={students} logs={logs}/>;

  return (
    <div className="admin-layout">
      <aside className="glass admin-sidebar">
        <Brand compact />
        <div className="admin-badge"><span>SUPER ADMIN</span><strong>{user.email}</strong></div>
        <nav>
          <button className={active==='dashboard'?'active':''} onClick={()=>navigate('/admin')}><span>⌂</span> Dashboard</button>
          <button className={active==='scan'?'active':''} onClick={()=>navigate('/admin/scan')}><span>◇</span> Gate scanner</button>
          <button className={active==='students'?'active':''} onClick={()=>navigate('/admin/students')}><span>◎</span> Paid students</button>
          <button className={active==='logs'?'active':''} onClick={()=>navigate('/admin/logs')}><span>≡</span> Entry logs</button>
        </nav>
        <div className="sidebar-bottom"><button onClick={()=>navigate('/')} className="sidebar-link">Student portal ↗</button><button onClick={onLogout} className="sidebar-link danger-link">Sign out</button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-mobile-head"><Brand compact/><button className="button button-ghost" onClick={onLogout}>Sign out</button></header>
        <div className="mobile-nav"><button className={active==='dashboard'?'active':''} onClick={()=>navigate('/admin')}>Home</button><button className={active==='scan'?'active':''} onClick={()=>navigate('/admin/scan')}>Scanner</button><button className={active==='students'?'active':''} onClick={()=>navigate('/admin/students')}>Students</button><button className={active==='logs'?'active':''} onClick={()=>navigate('/admin/logs')}>Logs</button></div>
        {content}
      </main>
    </div>
  );
}
