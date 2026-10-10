import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export interface ActivityPlan {
  id: number;
  title: string;
  game_key: string;
  config: any;
  instructions: string | null;
  frequency: string | null;
  duration_min: number | null;
  sessions_per_day: number;
  symbol: string | null;
  phoneme_name: string | null;
  stage_nome: string | null;
  words: any;
  syllables: any;
  sentences: any;
  sound_model: string | null;
  patient_id?: number;
  done?: { sessoes: number; tentativas: number; segundos: number; estrelas: number } | null;
}

interface Props {
  patientId: number;
  activityId: number;
  onExit: () => void;
}

/**
 * Container comum a todos os jogos:
 * - abre/encerra sessão no servidor
 * - exibe áudio/imagem/repetição
 * - registra tentativas (SEM classificar automaticamente)
 * - permite concluir, pausar ou interromper sem penalidade
 */
export function GameShell({ patientId, activityId, onExit, children }: Props & { children: (ctx: GameCtx) => React.ReactNode }) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [started] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [observation, setObservation] = useState('');

  useEffect(() => {
    let alive = true;
    api<{ id: number }>('/sessions/start', {
      method: 'POST',
      body: { activity_plan_id: activityId, patient_id: patientId },
    })
      .then((r) => alive && setSessionId(r.id))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activityId, patientId]);

  const registerAttempt = useCallback(
    async (item: { ref?: string | null; result?: 'acerto' | 'erro' | 'nao_avaliado'; position?: number | null }) => {
      setAttempts((a) => a + 1);
      if (!sessionId) return;
      await api(`/sessions/${sessionId}/attempts`, {
        method: 'POST',
        body: { item_ref: item.ref ?? null, result: item.result ?? 'nao_avaliado', position: item.position ?? null },
      }).catch(() => {});
    },
    [sessionId]
  );

  const end = useCallback(
    async (reason: 'concluida' | 'pausada' | 'interrompida' | 'abandonada') => {
      const duration = Math.round((Date.now() - started) / 1000);
      if (sessionId) {
        await api(`/sessions/${sessionId}/end`, {
          method: 'POST',
          body: {
            end_reason: reason,
            attempts,
            duration_sec: duration,
            observations: observation || null,
            stars: reason === 'concluida' ? 1 : 0,
          },
        }).catch(() => {});
      }
      onExit();
    },
    [sessionId, attempts, started, observation, onExit]
  );

  const ctx = useMemo<GameCtx>(
    () => ({ attempts, registerAttempt, end, observation, setObservation, setDone, done, setFeedback: () => {} }),
    [attempts, registerAttempt, end, observation, done]
  );

  if (!sessionId) {
    return (
      <div className="game-area center">
        <p>Preparando a brincadeira…</p>
      </div>
    );
  }

  return (
    <div className="game-area">
      {children(ctx)}
      <div className="row" style={{ marginTop: '1.2rem', justifyContent: 'center' }}>
        <button className="btn green lg" onClick={() => end('concluida')} disabled={done}>
          ✅ Terminei!
        </button>
        <button className="btn blue" onClick={() => end('pausada')}>⏸️ Pausar</button>
        <button className="btn ghost" onClick={() => end('interrompida')}>⏹️ Parar por hoje</button>
      </div>
      <p className="muted center" style={{ marginTop: '.8rem' }}>
        Pode parar quando quiser — não há errado e não perde nada. 💛
      </p>
      <div className="field" style={{ maxWidth: 520, margin: '1rem auto 0' }}>
        <label htmlFor="obs">Observação do responsável (opcional)</label>
        <textarea
          id="obs"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          placeholder="Como foi a tentativa? Alguma dificuldade?"
        />
      </div>
    </div>
  );
}

export interface GameCtx {
  attempts: number;
  registerAttempt: (item: { ref?: string | null; result?: 'acerto' | 'erro' | 'nao_avaliado'; position?: number | null }) => Promise<void>;
  end: (reason: 'concluida' | 'pausada' | 'interrompida' | 'abandonada') => Promise<void>;
  observation: string;
  setObservation: (v: string) => void;
  done: boolean;
  setDone: (v: boolean) => void;
  setFeedback: (v: string | null) => void;
}