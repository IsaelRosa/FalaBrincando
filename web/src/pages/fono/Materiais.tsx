import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { invalidaIndiceMidias } from '../../lib/midias';

const RIGHTS_LABEL: Record<string, string> = {
  proprio: 'Material próprio',
  licenciado: 'Licenciado',
  autorizado: 'Expressamente autorizado',
};

export function Materiais() {
  const [list, setList] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [q, setQ] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const load = () => api<any[]>('/materials' + buildQuery(q)).then(setList).catch((e) => setErro(e.message));
  useEffect(() => {
    api<any>('/materials/filters').then(setFilters).catch(() => {});
    load();
  }, []);
  useEffect(() => { load(); }, [q.category, q.phoneme_id, q.word_position, q.exercise_type, q.status]);

  const importar = async (form: FormData) => {
    setErro('');
    try {
      const r = await api<{ msg: string }>('/materials', { method: 'POST', form });
      setMsg(r.msg);
      invalidaIndiceMidias();
      (document.getElementById('arq') as HTMLInputElement).value = '';
      load();
    } catch (e: any) { setErro(e.message); }
  };

  const aprovar = async (id: number, status: string) => {
    await api(`/materials/${id}/status`, { method: 'PATCH', body: { status } });
    load();
  };

  return (
    <>
      <h1>📁 Biblioteca e importação de materiais</h1>
      <p className="muted">
        Importe apenas material próprio, licenciado ou expressamente autorizado. Tudo entra como
        “em revisão” e <strong>só chega à criança depois da sua aprovação</strong>.
      </p>
      {msg && <div className="alert ok">{msg}</div>}
      {erro && <div className="alert error">{erro}</div>}

      <div className="card">
        <h3>Importar ficha ou material</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            importar(new FormData(e.currentTarget as HTMLFormElement));
          }}
        >
          <div className="grid cols-3">
            <div className="field">
              <label>Arquivo (PDF, imagem, áudio ou vídeo)</label>
              <input id="arq" type="file" name="file" required accept=".pdf,image/*,audio/*,video/*" />
            </div>
            <div className="field">
              <label>Título</label>
              <input name="title" required />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select name="kind" defaultValue="ficha">
                <option value="ficha">Ficha</option>
                <option value="imagem">Imagem</option>
                <option value="audio">Áudio</option>
                <option value="video">Vídeo</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="field">
              <label>Categoria (ex.: animais, comida)</label>
              <input name="category" list="cats" />
              <datalist id="cats">{filters?.categories?.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="field">
              <label>Posição na palavra</label>
              <select name="word_position" defaultValue="">
                <option value="">—</option>
                {['inicial', 'medial', 'final', 'vogais', 'silabas', 'nucleo', 'coda', 'cluster'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tipo de exercício</label>
              <input name="exercise_type" list="exs" />
              <datalist id="exs">{filters?.exercises?.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="field">
              <label>Direitos</label>
              <select name="rights" defaultValue="proprio">
                <option value="proprio">Material próprio</option>
                <option value="licenciado">Licenciado</option>
                <option value="autorizado">Expressamente autorizado</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Origem / autorização (obrigatória se não for próprio)</label>
              <input name="rights_note" placeholder="Ex.: licensed para uso educacional; autorização da autora em 2026." />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Descrição</label>
              <textarea name="description" />
            </div>
          </div>
          <button className="btn">⬆️ Importar para revisão</button>
        </form>
      </div>

      <div className="card">
        <h3>Organizar por categoria, fonema, posição e exercício</h3>
        <div className="row">
          <select value={q.category ?? ''} onChange={(e) => setQ({ ...q, category: e.target.value })}>
            <option value="">Todas as categorias</option>
            {filters?.categories?.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={q.word_position ?? ''} onChange={(e) => setQ({ ...q, word_position: e.target.value })}>
            <option value="">Todas as posições</option>
            {filters?.positions?.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={q.status ?? ''} onChange={(e) => setQ({ ...q, status: e.target.value })}>
            <option value="">Todos os status</option>
            {['rascunho', 'revisao', 'aprovado', 'rejeitado'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <h3>Materiais ({list.length})</h3>
        {list.length === 0 && <p className="muted">Nenhum material importado.</p>}
        <table>
          <thead>
            <tr><th>Título</th><th>Tipo</th><th>Categoria</th><th>Posição</th><th>Direitos</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><div className="muted">{m.description}</div></td>
                <td>{m.kind}</td>
                <td>{m.category ?? '—'}</td>
                <td>{m.word_position ?? '—'}</td>
                <td className="muted">{RIGHTS_LABEL[m.rights]}{m.rights_note ? ` — ${m.rights_note}` : ''}</td>
                <td><StatusPill s={m.status} /></td>
                <td>
                  <div className="row">
                    {m.status !== 'aprovado' && <button className="btn small green" onClick={() => aprovar(m.id, 'aprovado')}>Aprovar</button>}
                    {m.status !== 'rejeitado' && <button className="btn small ghost" onClick={() => aprovar(m.id, 'rejeitado')}>Rejeitar</button>}
                    {m.kind === 'pdf' && (
                      <button className="btn small ghost" onClick={async () => {
                        const r = await api<{ text: string | null }>(`/materials/${m.id}/text`);
                        alert(r.text ? r.text.slice(0, 3000) : 'Sem texto extraível.');
                      }}>Ver texto</button>
                    )}
                    <button className="btn small ghost" onClick={async () => {
                      if (!confirm('Excluir este material?')) return;
                      await api(`/materials/${m.id}`, { method: 'DELETE' });
                      load();
                    }}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="alert warn" style={{ marginTop: '1rem' }}>
          <strong>Turno de ficha impressa para digital:</strong> importe o PDF, use “Ver texto”, edite as
          palavras e frases no cadastro do fonema e só então aprove. O conteúdo precisa da sua revisão
          antes de aparecer para a criança.
        </div>
      </div>
    </>
  );
}

function StatusPill({ s }: { s: string }) {
  const m: Record<string, [string, string]> = {
    rascunho: ['Rascunho', ''], revisao: ['Em revisão', 'sun'],
    aprovado: ['Aprovado', 'green'], rejeitado: ['Rejeitado', 'rose'],
  };
  const [label, cls] = m[s] ?? [s, ''];
  return <span className={`pill ${cls}`}>{label}</span>;
}

function buildQuery(q: Record<string, string>) {
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
}