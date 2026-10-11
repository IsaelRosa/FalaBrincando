import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="app">
      <header className="topbar">
        <div className="container">
          <NavLink to="/fono" className="brand">🪶 FalaBrincando</NavLink>
          <nav>
            {user?.role === 'fono' ? (
              <>
                <NavLink to="/fono" end>Painel</NavLink>
                <NavLink to="/fono/pacientes">Pacientes</NavLink>
                <NavLink to="/fono/biblioteca">Biblioteca</NavLink>
                <NavLink to="/fono/fonemas">Fonemas</NavLink>
                <NavLink to="/fono/materiais">Materiais</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/inicio" end>Início</NavLink>
                <NavLink to="/historico">Histórico</NavLink>
              </>
            )}
            <span className="user-chip">
              {user?.display_name?.slice(0, 22)}
              <button className="btn ghost small" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}
                onClick={() => { logout(); nav('/'); }}>Sair</button>
            </span>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
      <footer className="container" style={{ color: 'var(--texto-2)', fontSize: '.85rem', textAlign: 'center', paddingBottom: '1.5rem' }}>
        FalaBrincando é uma ferramenta complementar de apoio domiciliar e <strong>não substitui</strong> o
        acompanhamento profissional. Nenhum conteúdo clínico é gerado automaticamente.
      </footer>
    </div>
  );
}