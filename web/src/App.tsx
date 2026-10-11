import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './pages/Layout';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { CriarConta } from './pages/CriarConta';
import { FonoHome } from './pages/fono/FonoHome';
import { PacienteDetalhe } from './pages/fono/PacienteDetalhe';
import { Fonemas } from './pages/fono/Fonemas';
import { Materiais } from './pages/fono/Materiais';
import { Relatorios, RelatorioDetalhe } from './pages/fono/Relatorios';
import { Biblioteca } from './pages/fono/Biblioteca';
import { Perfil } from './pages/fono/Perfil';
import { Acompanhamento } from './pages/fono/Acompanhamento';
import { Gravações } from './pages/fono/Gravações';
import { Responsaveis } from './pages/fono/Responsaveis';
import { AcompanhamentoFamilia } from './pages/fono/Acompanhamento';
import { HomeResponsavel, Jogar, Historico } from './pages/responsavel';

function Guard({ children, role }: { children: React.ReactNode; role?: 'fono' | 'responsavel' }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="container">Carregando…</p>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (role && user.role !== role) return <Navigate to="/inicio" replace />;
  return <>{children}</>;
}

/** Envolve o calendário do responsável lendo o paciente da rota. */
function AcompanhamentoFamiliaRoute() {
  const { id } = useParams();
  return <AcompanhamentoFamilia patientId={Number(id)} />;
}

function GravaçõesRoute() {
  const { patientId } = useParams();
  return <Gravações patientId={Number(patientId)} />;
}

function ResponsaveisRoute() {
  const { patientId } = useParams();
  return <Responsaveis patientId={Number(patientId)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Rotas />
      </BrowserRouter>
    </AuthProvider>
  );
}

/**
 * Fica dentro do AuthProvider para poder ler o contexto de autenticação.
 * (Chamar useAuth() fora do provider retorna null.)
 */
function Rotas() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="auth-wrap">
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--navy)' }}>Carregando…</h2>
        </div>
      </div>
    );

  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route path="/criar-conta" element={<CriarConta />} />

      {/* Página inicial pública — quem já entrou vai direto para o app */}
      <Route path="/" element={user ? <Navigate to="/inicio" replace /> : <Landing />} />

      {/* Painel do responsável / tela da criança */}
      <Route path="/inicio" element={<Guard><HomeResponsavel /></Guard>} />
      <Route path="/jogo/:id" element={<Guard><Jogar /></Guard>} />
      <Route path="/historico" element={<Guard><Historico /></Guard>} />
      <Route path="/acompanhamento/:id" element={<Guard><AcompanhamentoFamiliaRoute /></Guard>} />

      {/* Painel profissional */}
      <Route element={<Guard role="fono"><Layout /></Guard>}>
        <Route path="/fono" element={<FonoHome />} />
        <Route path="/fono/pacientes/:id" element={<PacienteDetalhe />} />
        <Route path="/fono/pacientes/:id/perfil" element={<Perfil />} />
        <Route path="/fono/biblioteca" element={<Biblioteca />} />
        <Route path="/fono/acompanhamento/:patientId" element={<Acompanhamento />} />
        <Route path="/fono/gravacoes/:patientId" element={<GravaçõesRoute />} />
        <Route path="/fono/responsaveis/:patientId" element={<ResponsaveisRoute />} />
        <Route path="/fono/fonemas" element={<Fonemas />} />
        <Route path="/fono/materiais" element={<Materiais />} />
        <Route path="/fono/relatorios" element={<Relatorios />} />
        <Route path="/fono/relatorios/:patientId" element={<RelatorioDetalhe />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}