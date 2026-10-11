import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Mascote } from '../../components/ui';

const NIVEIS_AJUDA: Record<string, { nome: string; emoji: string; cor: string }> = {
  sozinha: { nome: 'Sozinha', emoji: '💪', cor: '#5cb85c' },
  com_pistas: { nome: 'Com pistas', emoji: '💡', cor: '#f6a01a' },
  com_ajuda: { nome: 'Com ajuda', emoji: '🤝', cor: '#ff9db1' },
  'não registrado': { nome: 'Não registrado', emoji: '—', cor: '#ccc' },
};

const HAB_NOME: Record<string, string> = {
  articulacao: 'Articulação',
  consciencia_fonologica: 'Consciência fonológica',
  linguagem: 'Linguagem',
  comunicacao_funcional: 'Comunicação funcional',
  fluencia: 'Fluência',
  motricidade_orofacial: 'Motricidade orofacial',
  sem_classificar: 'Sem classificar',
};

export function Acompanhamento() {
  const { patientId } = useParams();
  const pid = Number(patientId);
  const [ind, setInd] = useState<any>(null);
  const [mes, setMes] = useState('');
  const [cal, setCal] = useState<any>(null);
  const [paciente, setPaciente] = useState<any>(null);

  useEffect(() => {
    api(`/sessions/indicadores/${pid}`).then(setInd).catch(() => {});
    api<any[]>(`/patients`).then((ps) => setPaciente(ps.find((p) => p.id === pid) ?? null)).catch(() => {});
  }, [pid]);

  useEffect(() => {
    if (!mes) return;
    api(`/sessions/calendario/${pid}?mes=${mes}`).then(setCal).catch(() => {});
  }, [pid, mes]);

  const dias = useMemo(() => {
    if (!mes || !cal) return [];
    const [ano, m] = mes.split('-').map(Number);
    const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
    const lista: any[] = (cal?.dias ?? []) as any[];
    const porDia = new Map(lista.map((d: any) => [String(d.dia), d]));
    return Array.from({ length: total }, (_, i) => {
      const iso = `${mes}-${String(i + 1).padStart(2, '0')}`;
      return { n: i + 1, iso, dados: (porDia.get(iso) ?? null) as any };
    });
  }, [mes, cal]);

  const navegar = (delta: number) => {
    const [ano, m] = (mes || new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
    setMes(d.toISOString().slice(0, 7));
  };

  if (!ind) return <p>Carregando acompanhamento…</p>;

  const maxSessoes = Math.max(1, ...ind.porHabilidade.map((h: any) => h.sessoes));

  return (
    <>
      <div className="row between">
        <div className="row">
          <Mascote size={48} />
          <div>
            <h1 style={{ margin: 0 }}>📈 Acompanhamento</h1>
            <p className="muted" style={{ margin: 0 }}>
              {paciente?.apelido || paciente?.nome} · <Link to={`/fono/pacientes/${pid}`}>voltar ao plano</Link>
            </p>
          </div>
        </div>
        <Link className="btn ghost" to={`/fono/relatorios/${pid}`}>📊 Relatório</Link>
      </div>

      <div className="alert warn">{ind.aviso}</div>

      <div className="card">
        <h3>📅 Calendário de exercícios</h3>
        <div className="row">
          <button className="btn ghost small" onClick={() => navegar(-1)}>‹</button>
          <strong>{mes || new Date().toISOString().slice(0, 7)}</strong>
          <button className="btn ghost small" onClick={() => navegar(1)}>›</button>
          {cal?.streak > 0 && <span className="pill green">🔥 {cal.streak} dia(s) seguidos</span>}
        </div>
        <div className="calendario">
          {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="cal-dia cab">{d}</div>)}
          {dias.map((d) => {
            const c = d.dados?.concluidas ?? 0;
            return (
              <div key={d.iso} className={`cal-dia ${c > 0 ? 'feito' : ''} ${d.dados ? 'parcial' : ''}`}
                title={`${d.n}/${d.iso}: ${c} concluída(s)`}>
                {d.n}
                {c > 0 && <small>{c}</small>}
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: '.8rem' }}>
          O calendário é um registro, não uma cobrança. Pular dias não apaga o progresso.
        </p>
      </div>

      <div className="card">
        <h3>🎯 Praticado por habilidade</h3>
        {ind.porHabilidade.length === 0 && <p className="muted">Nenhuma atividade registrada ainda.</p>}
        {ind.porHabilidade.map((h: any) => (
          <div key={h.habilidade + h.fonema} style={{ marginBottom: '.9rem' }}>
            <div className="row between">
              <strong>{HAB_NOME[h.habilidade] ?? h.habilidade}</strong>
              <span className="muted">
                {h.fonema !== '—' && <>fonema <b>{h.fonema}</b> · </>}
                {h.sessoes} sessão(ões) · {Math.round((h.segundos ?? 0) / 60)} min
              </span>
            </div>
            <div className="barra" style={{ width: `${Math.round((h.sessoes / maxSessoes) * 100)}%` }} />
          </div>
        ))}
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>🤝 Nível de ajuda</h3>
          {ind.porAjuda.length === 0 && <p className="muted">Ainda não registrado.</p>}
          {ind.porAjuda.map((a: any) => {
            const info = NIVEIS_AJUDA[a.nivel] ?? NIVEIS_AJUDA['não registrado'];
            const total = ind.porAjuda.reduce((s: number, x: any) => s + x.n, 0);
            return (
              <div key={a.nivel} className="row" style={{ marginBottom: '.6rem' }}>
                <span className="pill" style={{ background: info.cor + '33', color: info.cor, minWidth: 130 }}>
                  {info.emoji} {info.nome}
                </span>
                <div className="barra" style={{ width: `${Math.round((a.n / Math.max(total,1)) * 100)}%`, background: info.cor }} />
                <span className="muted">{a.n}</span>
              </div>
            );
          })}
          <p className="muted">Sem certo ou errado — mostra como a criança conseguiu fazer.</p>
        </div>

        <div className="card">
          <h3>🔤 Palavras mais praticadas</h3>
          {ind.palavras.length === 0 && <p className="muted">Nenhuma palavra registrada.</p>}
          <div className="row">
            {ind.palavras.map((p: any) => (
              <span key={p.palavra} className="pill blue">{p.palavra} · {p.tentativas}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Versão simplificada para os responsáveis. */
export function AcompanhamentoFamilia({ patientId }: { patientId: number }) {
  const [ind, setInd] = useState<any>(null);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [cal, setCal] = useState<any>(null);

  useEffect(() => { api(`/sessions/indicadores/${patientId}`).then(setInd).catch(() => {}); }, [patientId]);
  useEffect(() => { api(`/sessions/calendario/${patientId}?mes=${mes}`).then(setCal).catch(() => {}); }, [patientId, mes]);

  const dias = useMemo(() => {
    if (!cal) return [];
    const [ano, m] = mes.split('-').map(Number);
    const total = new Date(Date.UTC(ano, m, 0)).getUTCDate();
    const lista: any[] = (cal.dias ?? []) as any[];
    const porDia = new Map(lista.map((d: any) => [String(d.dia), d]));
    return Array.from({ length: total }, (_, i) => {
      const iso = `${mes}-${String(i + 1).padStart(2, '0')}`;
      return { n: i + 1, iso, c: (porDia.get(iso) as any)?.concluidas ?? 0 };
    });
  }, [cal, mes]);

  if (!ind) return <p>Carregando…</p>;

  return (
    <>
      <div className="card">
        <h3>📅 Nosso calendário</h3>
        <div className="row">
          <button className="btn ghost small" onClick={() => setMes(shift(mes, -1))}>‹</button>
          <strong>{mes}</strong>
          <button className="btn ghost small" onClick={() => setMes(shift(mes, 1))}>›</button>
          {cal?.streak > 0 && <span className="pill green">🔥 {cal.streak} dia(s) seguidos</span>}
        </div>
        <div className="calendario">
          {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="cal-dia cab">{d}</div>)}
          {dias.map((d) => (
            <div key={d.iso} className={`cal-dia ${d.c > 0 ? 'feito' : ''}`}>
              {d.n}{d.c > 0 && <small>{d.c}</small>}
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: '.8rem' }}>
          Cada dia é uma oportunidade, não uma obrigação. O que importa é brincar junto.
        </p>
      </div>

      <div className="card tint-lilas">
        <h3>💛 Como estamos indo</h3>
        <div className="row">
          {ind.porAjuda.map((a: any) => {
            const info = NIVEIS_AJUDA[a.nivel] ?? NIVEIS_AJUDA['não registrado'];
            return <span key={a.nivel} className="pill">{info.emoji} {info.nome}: {a.n}</span>;
          })}
        </div>
        <p className="muted" style={{ marginTop: '.6rem' }}>
          Isto mostra apenas o que foi registrado em casa. A evolução é avaliada pela fonoaudióloga.
        </p>
      </div>
    </>
  );
}

function shift(mes: string, delta: number) {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, m - 1 + delta, 1)).toISOString().slice(0, 7);
}