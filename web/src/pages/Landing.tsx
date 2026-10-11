import { Link } from 'react-router-dom';

/**
 * Página inicial pública do FalaBrincando.
 * Não exige login: apresenta o projeto e convida a criar conta.
 */
export function Landing() {
  return (
    <div className="landing">
      <header className="l-header">
        <div className="l-container l-nav">
          <Link to="/" className="l-brand">
            <span className="l-logo">🗣️</span>
            <span>Fala<em>Brincando</em></span>
          </Link>
          <nav className="l-links" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#duvidas">Dúvidas</a>
            <Link to="/entrar" className="l-btn secondary">Entrar</Link>
            <Link to="/criar-conta" className="l-btn">Criar conta <span aria-hidden="true">→</span></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="l-hero" id="inicio">
          <div className="l-container l-hero-grid">
            <div>
              <div className="l-eyebrow">🌈 Terapia da fala com leveza</div>
              <h1>Pequenas brincadeiras.<br /><span>Grandes descobertas.</span></h1>
              <p>
                Atividades de fala e articulação para em casa, montadas pela fonoaudióloga
                para cada criança — com carinho, participação da família e respeito ao ritmo de cada uma.
              </p>
              <div className="l-actions">
                <Link to="/criar-conta" className="l-btn coral lg">
                  Criar minha conta <span aria-hidden="true">→</span>
                </Link>
                <Link to="/entrar" className="l-btn secondary">Já tenho conta</Link>
              </div>
              <p className="l-micro">💛 Cada criança tem seu tempo. O caminho pode ser mais leve quando a família participa.</p>
            </div>
            <div className="l-hero-art" aria-label="Ilustração lúdica de comunicação infantil">
              <span className="l-spark l-sp1">✦</span><span className="l-spark l-sp2">✧</span>
              <div className="l-blob"><div className="l-blob-inner">🧸💬</div></div>
              <div className="l-float l-f1">
                <span style={{ fontSize: '1.6rem' }}>🎨</span>
                <span>Aprender brincando<small>16 jogos educativos</small></span>
              </div>
              <div className="l-float l-f2">
                <span style={{ fontSize: '1.6rem' }}>💚</span>
                <span>No ritmo da criança<small>Um passo de cada vez</small></span>
              </div>
            </div>
          </div>
        </section>

        <div className="l-trust">
          <div className="l-container l-trust-grid">
            <div className="l-trust-item"><b>🎲</b> 16 jogos operacionais</div>
            <div className="l-trust-item"><b>👩‍👧</b> Família como parceira</div>
            <div className="l-trust-item"><b>🌱</b> Respeito à individualidade</div>
          </div>
        </div>

        <section className="l-section" id="recursos">
          <div className="l-container">
            <div className="l-head">
              <div className="l-eyebrow">Brincar com propósito</div>
              <h2>Um universo de possibilidades para se comunicar</h2>
              <p>Transforme momentos do dia a dia em oportunidades de interação, escuta, expressão e conexão.</p>
            </div>
            <div className="l-cards">
              <article className="l-card">
                <div className="l-card-icon">🗣️</div>
                <h3>Sons e pronúncia</h3>
                <p>Brincadeiras para explorar sons, sílabas e palavras em todas as posições, com modelo de fala e apoio visual.</p>
              </article>
              <article className="l-card">
                <div className="l-card-icon">📚</div>
                <h3>Linguagem e vocabulário</h3>
                <p>Histórias, figuras e jogos que incentivam a compreensão, a nomeação e a construção de frases.</p>
              </article>
              <article className="l-card">
                <div className="l-card-icon">🤝</div>
                <h3>Comunicação no cotidiano</h3>
                <p>Sugestões para estimular turnos de conversa, pedidos, escolhas, gestos e interação real.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="l-section l-how" id="como-funciona">
          <div className="l-container">
            <div className="l-head">
              <div className="l-eyebrow">Simples para a rotina</div>
              <h2>Aprender pode começar em casa</h2>
              <p>Pequenos momentos de atenção e brincadeira abrem espaço para novas descobertas.</p>
            </div>
            <div className="l-steps">
              <article className="l-step">
                <h3>A fonoaudióloga monta o plano</h3>
                <p>Ela escolhe os fonemas-alvo, as etapas da hierarquia e as atividades adequadas a cada criança.</p>
              </article>
              <article className="l-step">
                <h3>A família brinca junto</h3>
                <p>Missões curtas de 5 a 15 minutos, com narração, explicação simples e sem cobrança.</p>
              </article>
              <article className="l-step">
                <h3>Registra e acompanha</h3>
                <p>A família anota como foi e a profissional acompanha o progresso pelo painel.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="l-section">
          <div className="l-container l-feature">
            <div className="l-feature-art" aria-hidden="true"><span>🐻💬</span></div>
            <div className="l-feature-copy">
              <div className="l-eyebrow">Feito para apoiar, não pressionar</div>
              <h2>Mais conexão. Menos cobrança.</h2>
              <p>
                O FalaBrincando propõe um olhar acolhedor. O objetivo é criar oportunidades de
                interação, sem transformar cada momento em tarefa ou teste.
              </p>
              <ul className="l-check">
                <li><span>✓</span><div><strong>Nunca há errado</strong><br />Sem notas, sem comparação, sem penalidade.</div></li>
                <li><span>✓</span><div><strong>Conteúdo clínico da profissional</strong><br />Nada de instrução é gerada automaticamente.</div></li>
                <li><span>✓</span><div><strong>Acessível de verdade</strong><br />Narração, ajuste de animação, tempo e dificuldade.</div></li>
              </ul>
              <p className="l-note">
                O conteúdo é informativo e educativo. Não substitui avaliação, diagnóstico ou
                acompanhamento individual com fonoaudiólogo.
              </p>
            </div>
          </div>
        </section>

        <section className="l-section l-faq" id="duvidas">
          <div className="l-container">
            <div className="l-head">
              <div className="l-eyebrow">Dúvidas frequentes</div>
              <h2>Vamos conversar?</h2>
              <p>Algumas respostas para começar com tranquilidade.</p>
            </div>
            <div className="l-faq-list">
              <details>
                <summary>O FalaBrincando substitui a consulta com fonoaudióloga?</summary>
                <p>Não. É uma ferramenta complementar. A avaliação e o acompanhamento individual são feitos por fonoaudióloga habilitada.</p>
              </details>
              <details>
                <summary>Como o responsável entra?</summary>
                <p>Ele cria a conta com o próprio e-mail. Depois, a fonoaudióloga vincula o acesso da criança e define o período de uso — normalmente durante o tratamento.</p>
              </details>
              <details>
                <summary>As atividades servem para todas as crianças?</summary>
                <p>Cada criança tem interesses, necessidades e ritmo próprios. As atividades são filtradas por idade e adaptadas pela profissional.</p>
              </details>
              <details>
                <summary>Como posso apoiar a comunicação no dia a dia?</summary>
                <p>Reserve momentos de atenção, siga o interesse da criança, fale com naturalidade, leia histórias e dê tempo para que ela se expresse. Evite pressionar ou comparar.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="l-cta" id="comecar">
          <div className="l-container">
            <div className="l-cta-panel">
              <div>
                <h2>Vamos dar espaço para cada nova palavra?</h2>
                <p>Crie sua conta e comece as missões de hoje.</p>
              </div>
              <Link to="/criar-conta" className="l-btn coral">Criar conta <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="l-footer">
        <div className="l-container l-footer-row">
          <div>
            <div className="l-footer-brand">🗣️ FalaBrincando</div>
            <div className="l-footer-note">Brincar, comunicar e crescer.</div>
          </div>
          <div className="l-footer-note">
            Conteúdo educativo. Não substitui avaliação ou tratamento fonoaudiológico.
          </div>
        </div>
      </footer>
    </div>
  );
}