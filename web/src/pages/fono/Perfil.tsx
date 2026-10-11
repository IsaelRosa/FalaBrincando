import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

const AVATARES = ['🦜','🐻','🐰','🦊','🐨','🦁','🐸','🐧','🦄','🐝','🐢','🦋'];
const COMUNICACAO = [
  { v: 'oral', n: 'Oral' },
  { v: 'mista', n: 'Mista' },
  { v: 'AAC', n: 'Comunicação alternativa e aumentativa (AAC)' },
];
const NECESSIDADES = ['TEA','Síndrome de Down','Paralisia cerebral','Atraso de linguagem','Dificuldade motora','Déficit de atenção'];
const PREFERENCIAS = ['Animais','Coisas','Personagens','Carros','Brincar de casinha','Desenhar','Cozinhar','Música'];
const ACESSIBILIDADES = ['Instruções em áudio','Texto ampliado','Prancha de imagens (AAC)','Menos estímulos visuais','Sem animação','Tempo maior de resposta','Comunicação por gestos'];

export function Perfil() {
  const { id } = useParams();
  const pid = Number(id);
  const [p, setP] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [novaMeta, setNovaMeta] = useState('');
  const [salvando, setSalvando] = useState(false);

  const load = () => api(`/profile/${pid}`).then(setP).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, [pid]);

  if (msg && !p) return <div className="alert error">{msg}</div>;
  if (!p) return <p>Carregando…</p>;

  const salvar = async (patch: any) => {
    setSalvando(true);
    try {
      await api(`/profile/${pid}`, { method: 'PATCH', body: patch });
      await load();
      setMsg('Perfil salvo.');
      setTimeout(() => setMsg(''), 2000);
    } catch (e: any) {
      setMsg(e.message);
    } finally { setSalvando(false); }
  };

  const alternar = (campo: string, valor: string) => {
    const atual: string[] = p[campo] ?? [];
    salvar({ [campo]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor] });
  };

  const metas: any[] = p.metas ?? [];

  return (
    <>
      <div className="row between" style={{ marginBottom: '1rem' }}>
        <div className="row">
          <div style={{ fontSize: '3.2rem' }}>{p.avatar ?? '🦜'}</div>
          <div>
            <h1 style={{ margin: 0 }}>{p.apelido || p.nome}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {p.nome} · {p.idade !== null ? `${p.idade} anos` : 'idade não informada'}{' '}
              {p.birth_date ? `(${p.birth_date})` : ''}
            </p>
          </div>
        </div>
        <div className="row">
          <Link className="btn ghost" to={`/fono/pacientes/${pid}`}>Plano e atividades</Link>
          <Link className="btn ghost" to={`/fono/relatorios/${pid}`}>Relatório</Link>
        </div>
      </div>

      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <h3>👶 Identificação</h3>
        <div className="grid cols-3">
          <div className="field">
            <label>Nome</label>
            <input defaultValue={p.nome} onBlur={(e) => e.target.value !== p.nome && salvar({ nome: e.target.value })} />
          </div>
          <div className="field">
            <label>Apelido</label>
            <input defaultValue={p.apelido ?? ''} onBlur={(e) => salvar({ apelido: e.target.value })} />
          </div>
          <div className="field">
            <label>Data de nascimento</label>
            <input type="date" defaultValue={p.birth_date ?? ''} onBlur={(e) => salvar({ birth_date: e.target.value })} />
            <span className="hint">Idade calculada automaticamente</span>
          </div>
        </div>
        <div className="field">
          <label>Avatar</label>
          <div className="row">
            {AVATARES.map((a) => (
              <button key={a} className={`btn ${p.avatar === a ? '' : 'ghost'}`} style={{ fontSize: '1.6rem', minWidth: 52 }}
                onClick={() => salvar({ avatar: a })} aria-label={`Avatar ${a}`}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🗣️ Forma de comunicação</h3>
        <div className="row">
          {COMUNICACAO.map((c) => (
            <button key={c.v} className={`btn ${p.tipo_comunicacao === c.v ? '' : 'ghost'}`} onClick={() => salvar({ tipo_comunicacao: c.v })}>{c.n}</button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: '.6rem' }}>
          Quando a criança usa AAC, a fala oral não é exigida em nenhuma atividade.
        </p>
        <div className="field">
          <label>Observações dos responsáveis sobre comunicação e linguagem</label>
          <textarea defaultValue={p.observacoes_resp ?? ''} onBlur={(e) => salvar({ observacoes_resp: e.target.value })}
            placeholder="Como a criança se comunica em casa? O que é mais difícil?" />
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>🎯 Necessidades específicas</h3>
          <div className="row">
            {NECESSIDADES.map((n) => (
              <button key={n} className={`btn small ${(p.necessidades ?? []).includes(n) ? '' : 'ghost'}`} onClick={() => alternar('necessidades', n)}>{n}</button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '.6rem' }}>
            A biblioteca filtra e sugere adaptações a partir daqui.
          </p>
        </div>

        <div className="card">
          <h3>💛 Preferências</h3>
          <div className="row">
            {PREFERENCIAS.map((n) => (
              <button key={n} className={`btn small ${(p.preferencias ?? []).includes(n) ? '' : 'ghost'}`} onClick={() => alternar('preferencias', n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>♿ Recursos de acessibilidade necessários</h3>
        <div className="row">
          {ACESSIBILIDADES.map((n) => (
            <button key={n} className={`btn small ${(p.acessibilidade ?? []).includes(n) ? '' : 'ghost'}`} onClick={() => alternar('acessibilidade', n)}>{n}</button>
          ))}
        </div>
      </div>

      <div className="card tint-amarelo">
        <h3>🏁 Metas terapêuticas</h3>
        {metas.length === 0 && <p className="muted">Nenhuma meta definida.</p>}
        {metas.map((m) => (
          <div key={m.id} className="row" style={{ borderBottom: '2px solid var(--borda)', padding: '.4rem 0' }}>
            <input type="checkbox" checked={!!m.feito} onChange={() => salvarMeta(m, { feito: !m.feito })} style={{ width: 22, height: 22 }} />
            <span style={{ textDecoration: m.feito ? 'line-through' : 'none', flex: 1 }}>{m.texto}</span>
            {m.prazo && <span className="pill">{m.prazo}</span>}
            <button className="btn ghost small" onClick={() => removerMeta(m.id)}>Remover</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: '.8rem' }}>
          <input placeholder="Nova meta (ex.: Produzir /s/ inicial em 8 de 10 tentativas)" value={novaMeta}
            onChange={(e) => setNovaMeta(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          <button className="btn" disabled={!novaMeta.trim()} onClick={async () => {
            await api(`/profile/${pid}/metas`, { method: 'POST', body: { texto: novaMeta } });
            setNovaMeta(''); load();
          }}>Adicionar meta</button>
        </div>
      </div>

      {salvando && <p className="muted">Salvando…</p>}
    </>
  );

  async function salvarMeta(m: any, patch: any) {
    await api(`/profile/${pid}/metas/${m.id}`, { method: 'PATCH', body: patch });
    load();
  }
  async function removerMeta(metaId: number) {
    await api(`/profile/${pid}/metas/${metaId}`, { method: 'DELETE' });
    load();
  }
}