import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Mascote } from '../../components/ui';

export function FonoHome() {
  const [patients, setPatients] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [erro, setErro] = useState('');

  const load = () => api<any[]>('/patients').then(setPatients).catch((e) => setErro(e.message));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    try {
      await api('/patients', { method: 'POST', body: { nome: note } });
      setNote('');
      load();
    } catch (e: any) {
      setErro(e.message);
    }
  };

  return (
    <>
      <div className="row between" style={{ marginBottom: '1rem' }}>
        <div className="row">
          <Mascote size={54} />
          <div>
            <h1 style={{ margin: 0 }}>Painel da fonoaudióloga</h1>
            <p className="muted" style={{ margin: 0 }}>Planos, materiais e acompanhamento.</p>
          </div>
        </div>
      </div>

      {erro && <div className="alert error">{erro}</div>}

      <div className="card tint-lilas">
        <h3>➕ Novo paciente</h3>
        <form className="row" onSubmit={add}>
          <input
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Nome da criança"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
          <button className="btn">Cadastrar</button>
        </form>
        <p className="muted" style={{ margin: '.6rem 0 0' }}>
          Os dados são fictícios por padrão. Registre o consentimento do responsável e a autorização
          específica para gravações de voz.
        </p>
      </div>

      <div className="card">
        <h3>👧 Pacientes autorizados</h3>
        {patients.length === 0 ? (
          <div className="empty">
            <div className="big">📋</div>
            Nenhum paciente ainda.
          </div>
        ) : (
          <div className="grid cols-2">
            {patients.map((p) => (
              <Link key={p.id} to={`/fono/pacientes/${p.id}`} className="card tint-azul" style={{ display: 'block', marginBottom: 0 }}>
                <div className="row between">
                  <strong>{p.apelido || p.nome}</strong>
                  <span className="pill blue">{p.n_atividades} atividades</span>
                </div>
                <p className="muted" style={{ margin: '.4rem 0 0' }}>{p.nome}</p>
                <span className="row" style={{ marginTop: '.6rem' }}>
                  <Link to={`/fono/pacientes/${p.id}/perfil`} className="btn ghost small" onClick={(e) => e.stopPropagation()}>Perfil</Link>
                  <Link to={`/fono/pacientes/${p.id}`} className="btn small" onClick={(e) => e.stopPropagation()}>Plano</Link>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid cols-3">
        <Link to="/fono/fonemas" className="card center" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '2.2rem' }}>🔤</div>
          <strong>Cadastro de fonemas</strong>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>S, Z, CH, J, R, L, LH e outros</p>
        </Link>
        <Link to="/fono/materiais" className="card center" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '2.2rem' }}>📁</div>
          <strong>Biblioteca e importação</strong>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>PDFs, imagens, áudios e fichas</p>
        </Link>
        <Link to="/fono/biblioteca" className="card center" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '2.2rem' }}>📚</div>
          <strong>Biblioteca de atividades</strong>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>Por habilidade, idade e dificuldade</p>
        </Link>
        <Link to="/fono/relatorios" className="card center" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '2.2rem' }}>📊</div>
          <strong>Relatórios</strong>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>Histórico e exportação em PDF</p>
        </Link>
      </div>
    </>
  );
}