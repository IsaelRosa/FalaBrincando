import { useEffect, useState } from 'react';
import { api, auth } from '../../lib/api';

export function Gravações({ patientId }: { patientId: number }) {
  const [lista, setLista] = useState<any[]>([]);
  const [consent, setConsent] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [quem, setQuem] = useState('');

  const carregar = () => {
    api(`/recordings/${patientId}`)
      .then(setLista)
      .catch(() => setLista([]));
    api(`/recordings/${patientId}/consentimento`)
      .then(setConsent)
      .catch(() => setConsent(null));
  };
  useEffect(() => { carregar(); }, [patientId]);

  const alternarConsent = async (v: boolean) => {
    const texto = quem.trim();
    if (!texto) { setMsg('Informe quem autorizou a gravação.'); return; }
    await api(`/recordings/${patientId}/consentimento`, {
      method: 'POST',
      body: { autorizado: v, por_quem: texto },
    });
    setMsg(v ? 'Autorização registrada.' : 'Autorização removida — gravação bloqueada.');
    setTimeout(() => setMsg(''), 2500);
    carregar();
  };

  const revisar = async (id: number, observacao: string) => {
    await api(`/recordings/${id}/revisao`, { method: 'PATCH', body: { observacao, status: 'revisto' } });
    carregar();
  };

  return (
    <>
      {consent === null && (
        <div className="alert warn">
          Não foi possível ler a autorização de gravações deste paciente. Confirme que você tem
          acesso a ele — a fonoaudióloga só vê os próprios pacientes.
        </div>
      )}
      <div className="card">
        <h3>🎙️ Autorização para gravações de voz</h3>
        {msg && <div className="alert ok">{msg}</div>}
        <p className="muted">
          Sem autorização registrada, o botão de gravar fica bloqueado para a família — o sistema
          não permite contornar essa regra.
        </p>
        <div className="row">
          <span className={`pill ${consent?.autorizado ? 'green' : 'rose'}`}>
            {consent?.autorizado ? `✅ Autorizado${consent.por_quem ? ` por ${consent.por_quem}` : ''}` : '⛔ Não autorizado'}
          </span>
          <input placeholder="Nome de quem autorizou (ex.: mãe Ana)"
            value={quem} onChange={(e) => setQuem(e.target.value)} style={{ maxWidth: 280 }} />
          <button className="btn green small" onClick={() => alternarConsent(true)}>Registrar autorização</button>
          {consent?.autorizado && (
            <button className="btn ghost small" onClick={() => alternarConsent(false)}>Revogar</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>📼 Gravações recebidas ({lista.length})</h3>
        {lista.length === 0 && <p className="muted">Nenhuma gravação recebida.</p>}
        {lista.map((g) => (
          <div key={g.id} className="card tint-azul" style={{ marginBottom: '.8rem' }}>
            <div className="row between">
              <div>
                <strong>{g.label ?? 'Tentativa de fala'}</strong>
                <div className="muted">
                  {String(g.created_at).slice(0, 16)} · {g.atividade ?? 'sem atividade'} ·
                  {g.duracao_sec ? ` ${g.duracao_sec}s` : ''}
                </div>
              </div>
              <span className={`pill ${g.status === 'revisto' ? 'green' : 'sun'}`}>
                {g.status === 'revisto' ? '✓ revisada' : 'pendente'}
              </span>
            </div>
            <AudioProtegido id={g.id} />
            <input
              placeholder="Observação clínica sobre esta gravação"
              defaultValue={g.observacao ?? ''}
              onBlur={(e) => e.target.value !== (g.observacao ?? '') && revisar(g.id, e.target.value)}
              style={{ marginTop: '.5rem' }}
            />
            <div className="row" style={{ marginTop: '.5rem' }}>
              <button className="btn small ghost" onClick={async () => {
                if (!confirm('Excluir esta gravação?')) return;
                await api(`/recordings/${g.id}`, { method: 'DELETE' });
                carregar();
              }}>Excluir</button>
            </div>
          </div>
        ))}
        <div className="alert warn">
          As gravações contêm voz infantil. Mantenha-as restritas, não as divulgue e faça coleta
          mínima: apague o que não for mais necessário.
        </div>
      </div>
    </>
  );
}

/**
 * O áudio exige o token JWT, que a tag <audio> não envia.
 * Buscamos autenticado e criamos uma URL local temporária.
 */
function AudioProtegido({ id }: { id: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let revogar: string | null = null;
    let cancelado = false;
    (async () => {
      try {
        const resp = await fetch(`/api/recordings/audio/${id}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!resp.ok) throw new Error('Não foi possível carregar o áudio.');
        const blob = await resp.blob();
        if (cancelado) return;
        const u = URL.createObjectURL(blob);
        revogar = u;
        setUrl(u);
      } catch (e: any) {
        setErro(e.message);
      }
    })();
    return () => {
      cancelado = true;
      if (revogar) URL.revokeObjectURL(revogar);
    };
  }, [id]);

  if (erro) return <p className="muted">{erro}</p>;
  if (!url) return <p className="muted">Carregando áudio…</p>;
  return <audio controls src={url} style={{ width: '100%', marginTop: '.5rem' }} />;
}