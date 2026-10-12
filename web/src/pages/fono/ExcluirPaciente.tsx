import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export function ExcluirPaciente({ patient, onFim }: { patient: any; onFim: () => void }) {
  const [resumo, setResumo] = useState<any>(null);
  const [modo, setModo] = useState<'arquivar' | 'excluir'>('arquivar');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api(`/patients/${patient.id}/resumo-exclusao`).then(setResumo).catch((e) => setErro(e.message));
  }, [patient.id]);

  const nomeExato = patient.apelido || patient.nome;
  const podeExcluir = confirmacao.trim() === patient.nome;

  const executar = async () => {
    setErro('');
    setEnviando(true);
    try {
      const r = await api<{ msg: string }>(`/patients/${patient.id}?modo=${modo}`, {
        method: 'DELETE',
        body: { nome: patient.nome },
      });
      setOk(r.msg);
      setTimeout(() => {
        onFim();
        if (modo === 'arquivar') nav('/fono/pacientes');
      }, 1500);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-back" onClick={onFim}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Remover paciente</h2>
          <button className="btn ghost small" onClick={onFim}>Fechar</button>
        </div>

        {ok ? (
          <div className="alert ok">{ok}</div>
        ) : (
          <>
            <p>
              Você está remove <strong>{nomeExato}</strong> do seu painel.
            </p>

            {erro && <div className="alert error">{erro}</div>}

            {resumo && (
              <div className="alert info">
                <strong>O que existe hoje:</strong>
                <ul style={{ margin: '.4rem 0 0' }}>
                  <li>{resumo.atividades} atividade(s) no plano</li>
                  <li>{resumo.sessoes} sessão(ões) realizada(s) · {resumo.tentativas} tentativa(s)</li>
                  <li>{resumo.notas_clinicas} observação(ões) clínica(s)</li>
                  {resumo.gravacoes_de_voz > 0 && <li>🎙️ {resumo.gravacoes_de_voz} gravação(ões) de voz</li>}
                  {resumo.responsaveis > 0 && <li>👪 {resumo.responsaveis} responsável(is) vinculado(s)</li>}
                </ul>
              </div>
            )}

            <div className="field">
              <label>Escolha o que fazer</label>

              <label className={`card ${modo === 'arquivar' ? 'tint-verde' : ''}`} style={{ display: 'flex', gap: '.7rem', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '.6rem' }}>
                <input type="radio" checked={modo === 'arquivar'} onChange={() => setModo('arquivar')} style={{ width: 20, height: 20, marginTop: 4 }} />
                <span>
                  <strong>📦 Arquivar (recomendado)</strong>
                  <div className="muted">
                    Sai do painel imediatamente e o responsável perde o acesso.
                    <strong> Todos os dados ficam guardados</strong> — dá para restaurar depois.
                  </div>
                </span>
              </label>

              <label className={`card ${modo === 'excluir' ? 'tint-rosa' : ''}`} style={{ display: 'flex', gap: '.7rem', alignItems: 'flex-start', cursor: 'pointer', marginBottom: '.6rem' }}>
                <input type="radio" checked={modo === 'excluir'} onChange={() => setModo('excluir')} style={{ width: 20, height: 20, marginTop: 4 }} />
                <span>
                  <strong>🗑️ Excluir definitivamente</strong>
                  <div className="muted">
                    Apaga atividades, sessões, observações e gravações de voz.
                    <strong> Não dá para desfazer.</strong>
                  </div>
                </span>
              </label>
            </div>

            {modo === 'excluir' && (
              <div className="field">
                <label>Digite <strong>{patient.nome}</strong> para confirmar</label>
                <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder={patient.nome} />
              </div>
            )}

            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={onFim}>Cancelar</button>
              <button
                className={`btn ${modo === 'arquivar' ? '' : 'rose'}`}
                disabled={enviando || (modo === 'excluir' && !podeExcluir)}
                onClick={executar}
              >
                {enviando ? 'Processando...' : modo === 'arquivar' ? '📦 Arquivar' : '🗑️ Excluir definitivamente'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}