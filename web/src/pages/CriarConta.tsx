import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Mascote } from '../components/ui';

/** Cadastro público. O responsável cria a conta; o vínculo com a criança é feito pela fono. */
export function CriarConta() {
  const [role, setRole] = useState<'responsavel' | 'fono'>('responsavel');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const nav = useNavigate();

  const forte = senha.length >= 6;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (senha !== confirma) return setErro('As senhas não são iguais.');
    if (!forte) return setErro('A senha precisa ter ao menos 6 caracteres.');
    setEnviando(true);
    try {
      const r = await api<{ msg: string }>('/auth/register', {
        method: 'POST',
        body: { email, password: senha, display_name: nome, phone: tel || null, role },
      });
      setOk(r.msg);
      setTimeout(() => nav('/entrar'), 2500);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/" className="l-brand" style={{ textDecoration: 'none' }}>
          <span className="l-logo">🗣️</span>
          <span>Fala<em>Brincando</em></span>
        </Link>

        {ok ? (
          <>
            <div style={{ textAlign: 'center', margin: '26px 0' }}>
              <Mascote size={88} mood="comemorando" />
              <h1>Conta criada! 🎉</h1>
              <p className="sub">{ok}</p>
              <Link to="/entrar" className="l-btn lg">Ir para o login</Link>
            </div>
          </>
        ) : (
          <>
            <h1>Criar conta</h1>
            <p className="sub">Escolha seu perfil para começar.</p>

            {erro && <div className="auth-msg err">{erro}</div>}

            <div className="roles">
              <div className={`role ${role === 'responsavel' ? 'on' : ''}`} onClick={() => setRole('responsavel')}
                role="radio" aria-checked={role === 'responsavel'} tabIndex={0}>
                <span className="emoji">👩‍👧</span>
                <strong>Sou responsável</strong>
                <small>Quero acompañar as missões</small>
              </div>
              <div className={`role ${role === 'fono' ? 'on' : ''}`} onClick={() => setRole('fono')}
                role="radio" aria-checked={role === 'fono'} tabIndex={0}>
                <span className="emoji">🩺</span>
                <strong>Sou fonoaudióloga</strong>
                <small>Quero montar planos</small>
              </div>
            </div>

            <form onSubmit={enviar}>
              <div className="auth-field">
                <label>Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2}
                  placeholder="Maria Silva" />
              </div>

              <div className="auth-field">
                <label>E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="voce@email.com" />
                {role === 'responsavel' && (
                  <span className="hint">
                    Use o mesmo e-mail que a fonoaudióloga vai informar ao vincular seu acesso.
                  </span>
                )}
              </div>

              {role === 'responsavel' && (
                <div className="auth-field">
                  <label>Telefone (opcional)</label>
                  <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(11) 90000-0000" />
                </div>
              )}

              <div className="auth-field">
                <label>Senha</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
                  placeholder="Mínimo 6 caracteres" />
              </div>

              <div className="auth-field">
                <label>Repetir a senha</label>
                <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
                {senha && !forte && <span className="hint">Faltam {6 - senha.length} caracteres.</span>}
              </div>

              {role === 'responsavel' && (
                <div className="auth-msg info">
                  🔒 Depois de criar a conta, a fonoaudióloga é quem libera o acesso às missões da
                  criança — e define até quando vale.
                </div>
              )}

              <button className="l-btn lg" style={{ width: '100%' }} disabled={enviando}>
                {enviando ? 'Criando...' : 'Criar minha conta'}
              </button>
            </form>

            <div className="auth-alt">
              Já tem conta? <Link to="/entrar">Entrar</Link> · <Link to="/">Voltar ao início</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}