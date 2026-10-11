import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { speech } from '../lib/speech';
import { Mascote } from '../components/ui';

/**
 * Gravação da voz da criança para comparação educativa (escopo §6).
 *
 * Regras respeitadas:
 * - só funciona com autorização registrada pela fonoaudióloga;
 * - nenhuma análise automática — a fonoaudióloga ouve e avalia;
 * - nunca é tirada nota nem diagnóstico pelo sistema.
 */
export function Gravador({
  patientId,
  activityId,
  palavra,
}: {
  patientId: number;
  activityId?: number;
  palavra?: string;
}) {
  const [consent, setConsent] = useState<{ autorizado: boolean; por_quem: string | null } | null>(null);
  const [estado, setEstado] = useState<'parado' | 'gravando' | 'enviando' | 'pronto'>('parado');
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    api(`/recordings/${patientId}/consentimento`)
      .then(setConsent)
      .catch(() => setConsent({ autorizado: false, por_quem: null }));
  }, [patientId]);

  const parar = () => {
    if (timer.current) window.clearInterval(timer.current);
    rec.current?.stop();
  };

  const iniciar = async () => {
    setErro('');
    if (!consent?.autorizado) {
      setErro('A fonoaudióloga ainda não registrou a autorização para gravar.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        const arquivo = new File([blob], 'voz.webm', { type: blob.type });
        await enviar(arquivo, Math.round(segundos));
      };
      rec.current = r;
      r.start();
      setSegundos(0);
      setEstado('gravando');
      timer.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      setErro('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
      setEstado('parado');
    }
  };

  const enviar = async (arquivo: File, dur: number) => {
    setEstado('enviando');
    const fd = new FormData();
    fd.append('audio', arquivo);
    fd.append('duracao_sec', String(dur));
    if (activityId) fd.append('activity_id', String(activityId));
    fd.append('label', palavra ? `Tentativa: ${palavra}` : 'Tentativa de fala');
    try {
      await api(`/recordings/${patientId}`, { method: 'POST', form: fd });
      setUrl(URL.createObjectURL(arquivo));
      setEstado('pronto');
      speech.say('Gravação enviada. A fonoaudióloga vai ouvir.', { rate: 0.9 });
    } catch (e: any) {
      setErro(e.message);
      setEstado('parado');
    }
  };

  if (!consent) return null;

  if (!consent.autorizado)
    return (
      <div className="alert info" style={{ marginTop: '1rem' }}>
        🎙️ <strong>Gravar a voz</strong> está desativado.
        <div style={{ marginTop: '.3rem' }}>
          Só é possível gravar com autorização registrada pela fonoaudióloga. Nada é gravado
          sem essa autorização.
        </div>
      </div>
    );

  return (
    <div className="card tint-azul" style={{ marginTop: '1rem' }}>
      <div className="row between">
        <div className="row">
          <Mascote size={40} />
          <div>
            <strong>🎙️ Gravar minha tentativa</strong>
            <div className="muted">
              Autorizado{consent.por_quem ? ` por ${consent.por_quem}` : ''}. Só a fonoaudióloga ouve.
            </div>
          </div>
        </div>

        {estado === 'gravando' && (
          <div className="row">
            <span className="pill rose">● gravando {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}</span>
            <button className="btn green" onClick={parar}>⏹ Parar</button>
          </div>
        )}
        {estado === 'parado' && <button className="btn sun" onClick={iniciar}>🎙️ Gravar</button>}
        {estado === 'enviando' && <span className="pill">Enviando…</span>}
        {estado === 'pronto' && (
          <div className="row">
            {url && <audio controls src={url} style={{ height: 40 }} />}
            <button className="btn" onClick={() => { setEstado('parado'); setUrl(null); }}>Gravar de novo</button>
          </div>
        )}
      </div>

      {erro && <div className="alert error" style={{ marginTop: '.8rem' }}>{erro}</div>}

      <p className="muted" style={{ margin: '.6rem 0 0' }}>
        A gravação serve apenas para comparar. Não gera nota, diagnóstico nem correção automática.
      </p>
    </div>
  );
}