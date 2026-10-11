import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { speech } from '../lib/speech';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Lembrete dentro do app (sem push, sem cobrança).
 * Só aparece no dia e horário definidos — e nunca insiste.
 */
export function Lembrete({ patientId }: { patientId: number }) {
  const [cfg, setCfg] = useState<any>(null);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    api(`/profile/${patientId}/lembrete`).then((c) => {
      setCfg(c);
      if (c?.ativo) {
        const agora = new Date();
        // Janela de tolerância de 2 horas para não incomodar fora de hora.
        const [h, m] = c.hora.split(':').map(Number);
        const dentro = agora.getHours() * 60 + agora.getMinutes() >= h * 60 + m - 60 &&
                       agora.getHours() * 60 + agora.getMinutes() <= h * 60 + m + 60;
        if (dentro && c.dias.includes(agora.getDay())) setMostrar(true);
      }
    }).catch(() => {});
  }, [patientId]);

  if (!cfg) return null;

  return (
    <div className={`card ${mostrar ? 'tint-amarelo' : ''}`} style={{ marginBottom: '1rem' }}>
      <div className="row between">
        <div className="row">
          <span style={{ fontSize: '1.6rem' }}>{mostrar ? '⏰' : '🔕'}</span>
          <div>
            <strong>{mostrar ? cfg.texto : 'Lembrete configurado'}</strong>
            <div className="muted">
              {cfg.ativo
                ? `${cfg.hora} · ${cfg.dias.map((d: number) => DIAS[d]).join(', ')}`
                : 'Desativado — sem lembretes por enquanto.'}
            </div>
          </div>
        </div>
        <div className="row">
          {mostrar && (
            <button className="btn small sun" onClick={() => speech.say(cfg.texto)}>🔊 Ouvir</button>
          )}
          <button className="btn small ghost" onClick={() => setMostrar(!mostrar)}>
            {mostrar ? 'Esconder' : 'Ver'}
          </button>
        </div>
      </div>
      <p className="muted" style={{ margin: '.5rem 0 0' }}>
        Sem cobrança e sem punição. Pular um dia é normal e não apaga o progresso.
      </p>
    </div>
  );
}

/** Configuração do lembrete pelo responsável. */
export function ConfigLembrete({ patientId }: { patientId: number }) {
  const [cfg, setCfg] = useState<any>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => { api(`/profile/${patientId}/lembrete`).then(setCfg).catch(() => {}); }, [patientId]);

  const salvar = async (patch: any) => {
    const novo = { ...cfg, ...patch };
    setCfg(novo);
    await api(`/profile/${patientId}/lembrete`, { method: 'PATCH', body: patch }).catch(() => {});
    setSalvo(true);
    setTimeout(() => setSalvo(false), 1800);
  };

  if (!cfg) return null;

  return (
    <div className="card">
      <h3>⏰ Lembrete</h3>
      <div className="row">
        <label className="row" style={{ gap: '.4rem' }}>
          <input type="checkbox" checked={cfg.ativo} style={{ width: 22, height: 22 }}
            onChange={(e) => salvar({ ativo: e.target.checked })} />
          <strong>Lembre-me de brincar</strong>
        </label>
        <input type="time" value={cfg.hora} onChange={(e) => salvar({ hora: e.target.value })} style={{ maxWidth: 130 }} />
      </div>
      <div className="row" style={{ marginTop: '.6rem' }}>
        {DIAS.map((d, i) => (
          <button key={i} className={`btn small ${cfg.dias.includes(i) ? '' : 'ghost'}`}
            onClick={() => salvar({ dias: cfg.dias.includes(i) ? cfg.dias.filter((x: number) => x !== i) : [...cfg.dias, i] })}>
            {d}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginTop: '.8rem' }}>
        <label>Mensagem</label>
        <input defaultValue={cfg.texto} onBlur={(e) => e.target.value !== cfg.texto && salvar({ texto: e.target.value })} />
      </div>
      {salvo && <span className="pill green">Salvo</span>}
    </div>
  );
}