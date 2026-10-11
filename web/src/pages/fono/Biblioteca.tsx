import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const HABILIDADES = [
  { key: 'articulacao', nome: 'Articulação e pronúncia', emoji: '👄', cor: '#e63946' },
  { key: 'consciencia_fonologica', nome: 'Consciência fonológica', emoji: '👂', cor: '#f6a01a' },
  { key: 'linguagem', nome: 'Desenvolvimento da linguagem', emoji: '💬', cor: '#4d96ff' },
  { key: 'comunicacao_funcional', nome: 'Comunicação funcional', emoji: '🤝', cor: '#7b5ea7' },
  { key: 'fluencia', nome: 'Fluência da fala', emoji: '🌊', cor: '#00bbf9' },
  { key: 'motricidade_orofacial', nome: 'Motricidade orofacial', emoji: '🫧', cor: '#5cb85c' },
];

const NIVEIS = ['1', '2', '3'];

export function Biblioteca() {
  const [lista, setLista] = useState<any[]>([]);
  const [hab, setHab] = useState('');
  const [idade, setIdade] = useState('');
  const [nivel, setNivel] = useState('');
  const [search, setSearch] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacSel, setPacSel] = useState('');
  const [msg, setMsg] = useState('');
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const carregar = () => {
    const q = new URLSearchParams();
    if (hab) q.set('habilidade', hab);
    if (idade) q.set('idade', idade);
    if (nivel) q.set('nivel', nivel);
    if (search) q.set('search', search);
    api<any[]>(`/library?${q}`).then(setLista).catch((e) => setMsg(e.message));
  };

  useEffect(() => {
    api<any[]>('/patients').then((p) => { setPacientes(p); if (p[0]) setPacSel(String(p[0].id)); }).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [hab, idade, nivel]);

  const porHabilidade = useMemo(() => {
    const m = new Map<string, any[]>();
    lista.forEach((l) => {
      if (!m.has(l.habilidade)) m.set(l.habilidade, []);
      m.get(l.habilidade)!.push(l);
    });
    return m;
  }, [lista]);

  const adicionar = async (libId: number) => {
    if (!pacSel) { setMsg('Escolha um paciente.'); return; }
    await api(`/library/${libId}/instanciar`, { method: 'POST', body: { patient_id: Number(pacSel) } });
    setMsg('✅ Atividade adicionada ao plano do paciente.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <>
      <h1>📚 Biblioteca de atividades</h1>
      <p className="muted">
        Organizada por habilidade, faixa etária e nível de dificuldade. Cada atividade traz objetivo,
        materiais, passos, critérios de observação e orientações para o responsável.
      </p>

      {msg && <div className="alert ok">{msg}</div>}

      <div className="card">
        <div className="row">
          <input placeholder="Buscar atividade..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && carregar()} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn" onClick={carregar}>Buscar</button>
          <select value={hab} onChange={(e) => setHab(e.target.value)}>
            <option value="">Todas as habilidades</option>
            {HABILIDADES.map((h) => <option key={h.key} value={h.key}>{h.nome}</option>)}
          </select>
          <select value={idade} onChange={(e) => setIdade(e.target.value)}>
            <option value="">Qualquer idade</option>
            {[3,4,5,6,7,8,9,10,11,12].map((i) => <option key={i} value={i}>{i} anos</option>)}
          </select>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Todos os níveis</option>
            {NIVEIS.map((n) => <option key={n} value={n}>Nível {n}</option>)}
          </select>
        </div>
      </div>

      <div className="card tint-lilas">
        <div className="row">
          <strong>Adicionar ao plano de:</strong>
          <select value={pacSel} onChange={(e) => setPacSel(e.target.value)} style={{ maxWidth: 260 }}>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.apelido || p.nome}</option>)}
          </select>
          <span className="muted">A atividade é copiada com objetivo, passos e critérios.</span>
        </div>
      </div>

      {lista.length === 0 && <div className="empty"><div className="big">🔍</div>Nenhuma atividade encontrada.</div>}

      {[...porHabilidade.entries()].map(([key, itens]) => {
        const h = HABILIDADES.find((x) => x.key === key)!;
        return (
          <div key={key} className="card" style={{ borderLeft: `8px solid ${h.cor}` }}>
            <h3>{h.emoji} {h.nome} <span className="pill">{itens.length}</span></h3>
            <div className="grid cols-2">
              {itens.map((l) => (
                <div key={l.id} className="card tint-azul" style={{ margin: 0 }}>
                  <div className="row between">
                    <strong>{l.title}</strong>
                    <span className="pill sun">Nível {l.nivel}</span>
                  </div>
                  <p className="muted" style={{ margin: '.4rem 0' }}>{l.descricao}</p>
                  <div className="row">
                    <span className="pill">{l.idade_min}–{l.idade_max} anos</span>
                    <span className="pill green">⏱ {l.tempo_min} min</span>
                    {l.game_key && <span className="pill blue">{l.game_key}</span>}
                  </div>
                  <div className="row" style={{ marginTop: '.7rem' }}>
                    <button className="btn small" onClick={() => adicionar(l.id)}>➕ Adicionar ao plano</button>
                    <button className="btn small ghost" onClick={() => setDetalhe(l)}>Ver detalhes</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {detalhe && (
        <div className="modal-back" onClick={() => setDetalhe(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2 style={{ margin: 0 }}>{detalhe.title}</h2>
              <button className="btn ghost small" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
            <p className="muted">{detalhe.descricao}</p>
            <h3>🎯 Objetivo terapêutico</h3>
            <p>{detalhe.objetivo}</p>
            <h3>🧰 Materiais</h3>
            <ul>{(detalhe.materiais ?? []).map((m: string) => <li key={m}>{m}</li>)}</ul>
            <h3>👣 Passo a passo</h3>
            <ol>{(detalhe.passos ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
            {detalhe.modelo_fala && <><h3>🗣️ Modelo de fala</h3><p>{detalhe.modelo_fala}</p></>}
            <h3>🔍 Critérios de observação</h3>
            <p>{detalhe.criterios}</p>
            <h3>♿ Adaptações</h3>
            <p>{detalhe.adaptacoes}</p>
            <h3>👪 Orientações para o responsável</h3>
            <p>{detalhe.orientacoes}</p>
            <div className="alert warn" style={{ marginTop: '1rem' }}>
             Ajuste somente após avaliação profissional. Este conteúdo não é gerado automaticamente.
            </div>
            <button className="btn lg" onClick={() => { adicionar(detalhe.id); setDetalhe(null); }}>
              ➕ Adicionar ao plano
            </button>
          </div>
        </div>
      )}
    </>
  );
}