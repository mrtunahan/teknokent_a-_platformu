import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth';
import { closeSocket, useSocketEvent } from '../socket';
import { ROLES } from '../labels';

export default function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const notify = (text, to) => {
    setToast({ text, to });
    setTimeout(() => setToast(null), 6000);
  };
  useSocketEvent('match:new', (p) => notify(`Yeni eşleşme: ${p.company?.name}`, `/matches/${p.matchId}`));
  useSocketEvent('meeting:proposed', (p) => notify('Yeni toplantı önerisi', `/matches/${p.matchId}`));

  const logout = () => {
    closeSocket();
    auth.logout();
    navigate('/login');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">Tekno<span>Match</span></NavLink>
        <nav className="nav">
          {auth.isCompanyUser && (
            <>
              <NavLink to="/feed">Keşfet</NavLink>
              <NavLink to="/matches">Eşleşmeler</NavLink>
              <NavLink to="/profile">Profilim</NavLink>
            </>
          )}
          {auth.isPanelUser && <NavLink to="/panel">Teknokent paneli</NavLink>}
        </nav>
        <div className="userbox">
          <NavLink to="/account" className="userbox-name" title={ROLES[auth.user?.role]}>
            {auth.company?.name || auth.user?.fullName}
          </NavLink>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Çıkış</button>
        </div>
      </header>
      {auth.isCompanyUser && !auth.approved && (
        <div className="banner">
          Firmanız teknokent yönetiminin onayını bekliyor. Bu sırada <NavLink to="/profile">profilinizi tamamlayın</NavLink>;
          onaydan sonra akışınız açılır.
        </div>
      )}
      <main className="main"><Outlet /></main>
      {toast && (
        <button type="button" className="toast" onClick={() => { if (toast.to) navigate(toast.to); setToast(null); }}>
          {toast.text}
        </button>
      )}
    </div>
  );
}
