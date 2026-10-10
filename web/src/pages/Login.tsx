import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { Mascote } from '../components/ui';

export function Login() {
  const [email, setEmail] = useState('demo@falabrincando.app');
  const [password, setPassword] = useState('falabrincando123');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const nav = useNavigate();
  const { refresh } = useAuth();

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const r = await api<{ token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      auth.save(r.token, r.user);
      await refresh();
      nav(r.user.role === 'fono' ? '/fono' : '/');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="child-shell" style={{ justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: 440, width: '100%' }}>
        <div className="center" style={{ marginBottom: '1rem' }}>
          <Mascote size={92} />
          <h1 style={{ marginTop: '.5rem' }}>FalaBrincando</h1>
          <p className="muted" style={{ margin: 0 }}>Terapia da Fala em Casa</p>
        </div>
        {erro && <div className="alert error">{erro}</div>}
        <form onSubmit={entrar}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn lg" style={{ width: '100%' }} disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <div className="alert info" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <strong>Demonstração</strong>
          <div className="muted" style={{ fontWeight: 400 }}>
            Fonoaudióloga: <code>demo@falabrincando.app</code><br />
            Responsável: <code>responsavel@falabrincando.app</code><br />
            Senha: <code>falabrincando123</code> · Dados fictícios.
          </div>
        </div>
      </div>
    </div>
  );
}