import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { speech } from '../../lib/speech';

export function Fonemas() {
  const [list, setList] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const load = () => api<any[]>('/phonemes').then((r) => { setList(r); setSel(r[0] ?? null); }).catch((e) => setErro(e.message));
  useEffect(() => { load(); }, []);

  const novo = async () => {
    const p = await api<{ id: number }>('/phonemes', {
      method: 'POST',
      body: { symbol: 'NOVO', name: 'NOVO', kind: 'consoante' },
    });
    setMsg('Fonema criado. Edite os campos ao lado.');
    const fresh = await api<any[]>('/phonemes');
    setList(fresh);
    setSel(fresh.find((f) => f.id === p.id) ?? null);
  };

  const salvar = async (patch: any) => {
    setErro('');
    try {
      await api(`/phonemes/${sel.id}`, { method: 'PATCH', body: patch });
      setMsg('Salvo.');
      setTimeout(() => setMsg(''), 1500);
      load();
    } catch (e: any) { setErro(e.message); }
  };

  return (
    <>
      <h1>🔤 Cadastro de fonemas</h1>
      <p className="muted">
        Modelos globais são somente leitura — clique em “Duplicar para minha conta” para adaptar.
        Uma letra pode ter sons diferentes conforme a palavra; registre a variação aqui.
      </p>
      {msg && <div className="alert ok">{msg}</div>}
      {erro && <div className="alert error">{erro}</div>}

      <div className="row" style={{ margin: '.8rem 0' }}>
        <button className="btn" onClick={novo}>➕ Novo fonema</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(200px,280px) 1fr' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          {list.map((p) => (
            <button key={p.id} className="btn ghost" style={{ width: '100%', marginBottom: '.4rem', justifyContent: 'space-between' }}
              onClick={() => setSel(p)}>
              <span>{p.symbol} {p.is_global && '🌐'}</span>
              <small>{p.kind === 'grupo_consonantal' ? 'grupo' : p.kind}</small>
            </button>
          ))}
        </div>

        <div>
          {sel ? <FonemaEditor key={sel.id} phoneme={sel} onSave={salvar} /> : <p>Nenhum fonema.</p>}
        </div>
      </div>
    </>
  );
}

function FonemaEditor({ phoneme, onSave }: { phoneme: any; onSave: (p: any) => void }) {
  const [f, setF] = useState(() => ({ ...phoneme }));
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  if (phoneme.is_global) {
    return (
      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>{phoneme.symbol} <span className="pill">modelo global</span></h2>
          <button className="btn" onClick={async () => {
            const r = await api<{ id: number }>(`/phonemes/${phoneme.id}/clone`, { method: 'POST' });
            window.location.reload();
            return r;
          }}>Duplicar para minha conta</button>
        </div>
        <ReadonlyView p={phoneme} />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: '.8rem' }}>
        <div className="field" style={{ width: 130 }}>
          <label>Símbolo</label>
          <input value={f.symbol ?? ''} onChange={(e) => set('symbol', e.target.value)} />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label>Tipo</label>
          <select value={f.kind ?? 'consoante'} onChange={(e) => set('kind', e.target.value)}>
            <option value="consoante">Consoante</option>
            <option value="grupo_consonantal">Grupo consonantal</option>
            <option value="vogal">Vogal</option>
            <option value="silaba">Sílaba</option>
            <option value="cluster">Cluster</option>
          </select>
        </div>
        <div className="field" style={{ width: 130 }}>
          <label>IPA</label>
          <input value={f.ipa ?? ''} onChange={(e) => set('ipa', e.target.value)} />
        </div>
      </div>

      <Field label="Som / modelo de fala" value={f.sound_model ?? ''} onChange={(v) => set('sound_model', v)} />
      <Field label="Descrição" value={f.description ?? ''} onChange={(v) => set('description', v)} />
      <Field label="Variações do português brasileiro" value={f.variation_ptbr ?? ''} onChange={(v) => set('variation_ptbr', v)} multiline />

      <div className="field">
        <label>Posições na palavra</label>
        <div className="row">
          {['inicial', 'medial', 'final'].map((p) => (
            <button key={p} className={`btn small ${(f.target_positions ?? []).includes(p) ? '' : 'ghost'}`}
              onClick={() => {
                const cur: string[] = f.target_positions ?? [];
                set('target_positions', cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
              }}>{p}</button>
          ))}
        </div>
      </div>

      <Field label="Sílabas (uma por linha)" value={toLines(f.syllables)} onChange={(v) => set('syllables', splitLines(v))} multiline />
      <Field label="Combinações (uma por linha)" value={toLines(f.combinations)} onChange={(v) => set('combinations', splitLines(v))} multiline />
      <Field label="Palavras (uma por linha, ex.: sol | inicial | sol)" value={wordsToLines(f.words)} onChange={(v) => set('words', linesToWords(v))} multiline />
      <Field label="Frases (uma por linha)" value={toLines(f.sentences)} onChange={(v) => set('sentences', splitLines(v))} multiline />
      <Field label="Textos para leitura" value={f.texts ?? ''} onChange={(v) => set('texts', v)} multiline />

      <Field label="Instruções específicas para o responsável" value={f.guardian_instructions ?? ''} onChange={(v) => set('guardian_instructions', v)} multiline />
      <Field label="Objetivos" value={f.objectives ?? ''} onChange={(v) => set('objectives', v)} multiline />
      <Field label="Critérios de acompanhamento" value={f.followup_criteria ?? ''} onChange={(v) => set('followup_criteria', v)} multiline />
      <Field label="Observações profissionais" value={f.clinical_notes ?? ''} onChange={(v) => set('clinical_notes', v)} multiline />

      <button className="btn lg" onClick={() => onSave(f)}>💾 Salvar fonema</button>
    </div>
  );
}

function ReadonlyView({ p }: { p: any }) {
  return (
    <>
      <div className="alert info">{p.description}</div>
      {p.sound_model && <p><strong>Modelo de fala:</strong> {p.sound_model}</p>}
      {p.variation_ptbr && <p><strong>Variações PT-BR:</strong> {p.variation_ptbr}</p>}
      {p.target_positions?.length > 0 && (
        <p><strong>Posições:</strong> {p.target_positions.join(', ')}</p>
      )}
      {p.syllables?.length > 0 && (
        <>
          <h3>Sílabas</h3>
          <div className="row">{p.syllables.map((s: string) => <button key={s} className="btn secondary" onClick={() => speech.say(String(s), { rate: 0.5 })}>{s}</button>)}</div>
        </>
      )}
      {p.words?.length > 0 && (
        <>
          <h3>Palavras</h3>
          <div className="grid cols-3">
            {p.words.map((w: any, i: number) => (
              <div key={i} className="card tint-amarelo" style={{ margin: 0 }}>
                <strong>{w.word}</strong> <span className="pill">{w.position}</span>
                <div className="muted">{w.syllables?.join(' · ')}</div>
                <button className="btn ghost small" onClick={() => speech.say(w.word)}>🔊 Ouvir</button>
              </div>
            ))}
          </div>
        </>
      )}
      {p.sentences?.length > 0 && (
        <>
          <h3>Frases</h3>
          <ul>{p.sentences.map((s: string, i: number) => <li key={i}>{s} <button className="btn ghost small" onClick={() => speech.say(s)}>🔊</button></li>)}</ul>
        </>
      )}
      {p.guardian_instructions && <div className="alert warn"><strong>Para o responsável:</strong> {p.guardian_instructions}</div>}
      {p.followup_criteria && <p><strong>Critérios:</strong> {p.followup_criteria}</p>}
    </>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="field">
      <label>{label}</label>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

const splitLines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const toLines = (v: any) => (Array.isArray(v) ? v.join('\n') : v ?? '');
const wordsToLines = (v: any) =>
  (Array.isArray(v) ? v : []).map((w: any) => `${w.word} | ${w.position ?? ''} | ${(w.syllables ?? []).join('-')}`).join('\n');
const linesToWords = (v: string) =>
  splitLines(v).map((l) => {
    const [word, position, syll] = l.split('|').map((x) => x.trim());
    return { word, position: position || null, syllables: syll ? syll.split('-').filter(Boolean) : [] };
  });