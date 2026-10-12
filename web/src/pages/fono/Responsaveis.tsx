import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const hoje = () => new Date().toISOString().slice(0, 10);
const em90 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
};

const STATUS: Record<string, [string, string]> = {
  ativo: ['Ativo', 'green'],
  suspenso: ['Suspenso', 'sun'],
  encerrado: ['Encerrado', 'rose'],
};

export function Responsaveis({ patientId }: { patientId: number }) {
  const [lista, setLista] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);

  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [parente, setParente] = useState('Mãe');
  const [senha, setSenha] = useState('');
  const [de] = useState(hoje());
  const [ate, setAte] = useState(em90());

  const carregar = () =>
    api<any[]>(`/guardians/${patientId}`).then(setLista).catch((e) => setMsg(e.message));
  useEffect(() => { carregar(); }, [patientId]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const r = await api<{ senha_sugerida: string; email: string }>(`/guardians/${patientId}`, {
        method: 'POST',
        body: {
          email, nome, telefone: tel || null, relation: parente,
          senha: senha || undefined,
          valido_de: de || null, valido_ate: ate || null,
        },
      });
      const s = r.senha_sugerida;
      if (s && !s.startsWith('(')) setSenhaGerada({ email: r.email, senha: s });
      setMsg('Acesso liberado. Passe a senha por um canal seguro.');
      setEmail(''); setNome(''); setTel(''); setSenha('');
      carregar();
    } catch (err: any) { setMsg(err.message); }
  };

  const acao = async (id: number, body: any) => {
    await api(`/guardians/${patientId}/${id}`, { method: 'PATCH', body });
    carregar();
  };

  return (
    <>
      <div className="card">
        <h3>👪 Acesso dos responsáveis</h3>
        <p className="muted">
          Só quem você vincular aqui enxerga as atividades desta criança. O acesso vale durante o
          tratamento — depois disso, bloqueie.
        </p>

        {msg && <div className="alert ok">{msg}</div>}
        {senhaGerada && (
          <div className="alert warn">
            <strong>Anote agora — a senha não será exibida de novo:</strong>
            <div style={{ fontSize: '1.1rem', marginTop: '.3rem' }}>
              {senhaGerada.email} → <code>{senhaGerada.senha}</code>
            </div>
            <button className="btn ghost small" style={{ marginTop: '.5rem' }}
              onClick={() => setSenhaGerada(null)}>Já anotei</button>
          </div>
        )}

        <form onSubmit={salvar}>
          <div className="grid cols-3">
            <div className="field">
              <label>Nome do responsável</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria Silva" />
            </div>
            <div className="field">
              <label>E-mail (é o login)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input value={tel} onChange={(e) => setTel(e.target.value)} />
            </div>
            <div className="field">
              <label>Parentesco</label>
              <select value={parente} onChange={(e) => setParente(e.target.value)}>
                {['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Responsável legal', 'Professor'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Senha (opcional)</label>
              <input value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Deixe vazio para gerar uma sugestão" />
              <span className="hint">
                Escreva a senha <strong>em texto</strong> (ex.: <code>Isa2026@40</code>).
                Não cole o hash do banco. Se você definir, ela passa a ser a única aceita.
              </span>
            </div>
            <div className="field">
              <label>Acesso até</label>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
          </div>
          <button className="btn">Liberar acesso</button>
        </form>
      </div>

      <div className="card">
        <h3>Responsáveis vinculados ({lista.length})</h3>
        {lista.length === 0 && <p className="muted">Ninguém vinculado ainda.</p>}
        {lista.map((g) => {
          const [rotulo, cls] = STATUS[g.status] ?? [g.status, ''];
          return (
            <div key={g.id} className="card tint-lilas" style={{ marginBottom: '.7rem' }}>
              <div className="row between">
                <div>
                  <strong>{g.display_name}</strong>
                  <div className="muted">{g.email} · {g.relation}{g.phone ? ` · ${g.phone}` : ''}</div>
                  <div className="muted">
                    Período: {g.valido_de ?? 'sem data'} → {g.valido_ate ?? 'sem prazo'}
                  </div>
                </div>
                <div className="row">
                  <span className={`pill ${cls}`}>{rotulo}</span>
                  {g.vencido && <span className="pill rose">prazo vencido</span>}
                  {g.fora_da_validade && <span className="pill sun">ainda não começa</span>}
                </div>
              </div>
              <div className="row" style={{ marginTop: '.6rem' }}>
                {g.status !== 'ativo' && (
                  <button className="btn small green" onClick={() => acao(g.id, { status: 'ativo' })}>Reativar</button>
                )}
                {g.status === 'ativo' && (
                  <button className="btn small sun" onClick={() => acao(g.id, { status: 'suspenso' })}>Suspender</button>
                )}
                {g.status !== 'encerrado' && (
                  <button className="btn small ghost" onClick={() => acao(g.id, { status: 'encerrado' })}>Encerrar acesso</button>
                )}
                <input type="date" defaultValue={g.valido_ate ?? ''} style={{ maxWidth: 160 }}
                  onBlur={(e) => e.target.value && acao(g.id, { valido_ate: e.target.value })} />
                <button className="btn small green" onClick={async () => {
                  if (!confirm('Gerar uma nova senha para este responsável? A senha atual deixa de funcionar.')) return;
                  try {
                    const r = await api<{ senha: string }>(`/guardians/${patientId}/${g.id}/gerar-senha`, { method: 'POST' });
                    setSenhaGerada({ email: g.email, senha: r.senha });
                    carregar();
                  } catch (e: any) { setMsg(e.message); }
                }}>🔑 Gerar senha</button>
                <button className="btn small ghost" onClick={async () => {
                  if (!confirm('Remover o vínculo deste responsável?')) return;
                  await api(`/guardians/${patientId}/${g.id}`, { method: 'DELETE' });
                  carregar();
                }}>Remover</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}