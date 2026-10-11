import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './pages/Layout';
import { Login } from './pages/Login';
import { FonoHome } from './pages/fono/FonoHome';
import { PacienteDetalhe } from './pages/fono/PacienteDetalhe';
import { Fonemas } from './pages/fono/Fonemas';
import { Materiais } from './pages/fono/Materiais';
import { Relatorios, RelatorioDetalhe } from './pages/fono/Relatorios';
import { Biblioteca } from './pages/fono/Biblioteca';
import { Perfil } from './pages/fono/Perfil';
import { HomeResponsavel, Jogar, Historico } from './pages/responsavel';

function Guard({ children, role }: { children: React.ReactNode; role?: 'fono' | 'responsavel' }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="container">Carregando…</p>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Login />} />

          {/* Painel do responsável / tela da criança */}
          <Route path="/" element={<Guard><HomeResponsavel /></Guard>} />
          <Route path="/jogo/:id" element={<Guard><Jogar /></Guard>} />
          <Route path="/historico" element={<Guard><Historico /></Guard>} />

          {/* Painel profissional */}
          <Route element={<Guard role="fono"><Layout /></Guard>}>
            <Route path="/fono" element={<FonoHome />} />
            <Route path="/fono/pacientes/:id" element={<PacienteDetalhe />} />
            <Route path="/fono/pacientes/:id/perfil" element={<Perfil />} />
            <Route path="/fono/biblioteca" element={<Biblioteca />} />
            <Route path="/fono/fonemas" element={<Fonemas />} />
            <Route path="/fono/materiais" element={<Materiais />} />
            <Route path="/fono/relatorios" element={<Relatorios />} />
            <Route path="/fono/relatorios/:patientId" element={<RelatorioDetalhe />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}