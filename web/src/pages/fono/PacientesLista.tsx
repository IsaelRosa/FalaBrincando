import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Mascote } from '../../components/ui';
import { ExcluirPaciente } from './ExcluirPaciente';

export function PacientesLista() {
  const [lista, setLista] = useState<any[]>([]);
  const [arquivados, setArquivados] = useState<any[]>([]);
  const [novo, setNovo] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [excluindo, setExcluindo] = useState<any | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);
  const nav = useNavigate();

  const load = () => {
    api<any[]>('/patients').then(setLista).catch((e) => setErro(e.message));
    api<any[]>('/patients/arquivados/lista').then(setArquivados).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    try {
      const r = await api<{ id: number }>('/patients', { method: 'POST', body: { nome: novo } });
      setNovo('');
      load();
      nav(`/fono/pacientes/${r.id}`);
    } catch (err: any) { setErro(err.message); }
  };

  const restaurar = async (id: number) => {
    await api(`/patients/${id}/restaurar`, { method: 'POST' });
    setMsg('Paciente restaurado. Revise o acesso dos responsáveis.');
    setTimeout(() => setMsg(''), 2500);
    load();
  };

  const filtrados = lista.filter((p) =>
    !busca || `${p.nome} ${p.apelido ?? ''}`.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="row between" style={{ marginBottom: '1rem' }}>
        <div className="row">
          <Mascote size={50} />
          <div>
            <h1 style={{ margin: 0 }}>Pacientes</h1>
            <p className="muted" style={{ margin: 0 }}>Só você vê e trata dos seus pacientes.</p>
          </div>
        </div>
        <Link to="/fono" className="btn ghost">← Painel</Link>
      </div>

      {msg && <div className="alert ok">{msg}</div>}
      {erro && <div className="alert error">{erro}</div>}

      <div className="card tint-lilas">
        <h3>➕ Novo paciente</h3>
        <form className="row" onSubmit={criar}>
          <input
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Nome da criança"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            required
          />
          <button className="btn">Cadastrar</button>
        </form>
        <p className="muted" style={{ margin: '.6rem 0 0' }}>
          Cadastre só o nome. O restante (data de nascimento, avatar, preferências, metas) fica na
          aba <strong>👶 Perfil</strong>. Registre o consentimento do responsável antes de usar com
          dados reais.
        </p>
      </div>

      {lista.length > 0 && (
        <div className="card">
          <div className="row between">
            <h3>🔎 Filtrar</h3>
            {arquivados.length > 0 && (
              <button className="btn ghost small" onClick={() => setVerArquivados(!verArquivados)}>
                🗂️ Arquivados ({arquivados.length})
              </button>
            )}
          </div>
          <input
            placeholder="Buscar por nome ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      )}

      {verArquivados && (
        <div className="alert info">
          <strong>Pacientes arquivados</strong>
          <div className="muted" style={{ margin: '.3rem 0 .6rem' }}>
            Fora do painel, mas com todos os dados guardados.
          </div>
          {arquivados.map((p) => (
            <div key={p.id} className="row between" style={{ padding: '.3rem 0' }}>
              <span>{p.apelido || p.nome}</span>
              <button className="btn small" onClick={() => restaurar(p.id)}>♻️ Restaurar</button>
            </div>
          ))}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="empty">
          <div className="big">📋</div>
          Nenhum paciente ainda. Cadastre o primeiro acima.
        </div>
      ) : filtrados.length === 0 ? (
        <div className="empty">Nenhum paciente com esse nome.</div>
      ) : (
        <div className="grid cols-3">
          {filtrados.map((p) => (
            <div key={p.id} className="card tint-azul" style={{ marginBottom: 0 }}>
              <div className="row between">
                <strong>{p.avatar ?? '🦜'} {p.apelido || p.nome}</strong>
                <span className="pill blue">{p.n_atividades} ativ.</span>
              </div>
              <div className="muted">{p.nome}</div>

              <div className="row" style={{ marginTop: '.8rem' }}>
                <Link to={`/fono/pacientes/${p.id}`} className="btn small">Plano</Link>
                <Link to={`/fono/pacientes/${p.id}/perfil`} className="btn ghost small">Perfil</Link>
                <Link to={`/fono/responsaveis/${p.id}`} className="btn ghost small">👪</Link>
                <button
                  className="btn ghost small"
                  style={{ color: '#96263c', borderColor: '#ffc2cc' }}
                  onClick={() => setExcluindo(p)}
                  aria-label={`Remover ${p.nome}`}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {excluindo && (
        <ExcluirPaciente
          patient={excluindo}
          onFim={() => { setExcluindo(null); load(); }}
        />
      )}
    </>
  );
}