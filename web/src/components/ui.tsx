import { useEffect, useState, type ReactNode } from 'react';
import { speech, prefersReducedMotion } from '../lib/speech';

/** Mascote original — "Fubá", o passarinho que acompanha as missões. */
export function Mascote({ mood = 'feliz', size = 64 }: { mood?: 'feliz' | 'pensativo' | 'comemorando'; size?: number }) {
  const eyes = mood === 'comemorando' ? '✦ ✦' : mood === 'pensativo' ? '◕ ◕' : '● ●';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Fubá, o passarinho mascote">
      <circle cx="50" cy="55" r="34" fill="#ffc94d" />
      <circle cx="50" cy="55" r="34" fill="none" stroke="#e0a92b" strokeWidth="3" />
      <text x="50" y="60" textAnchor="middle" fontSize="16" fill="#5b448a" fontWeight="bold">
        {eyes}
      </text>
      <path d="M70 55 l16 -8 l-4 16 z" fill="#ff9f5a" />
      <path d="M50 22 q-6 -18 8 -20 q10 -2 8 14" fill="#ffd76e" stroke="#e0a92b" strokeWidth="3" />
      <path d="M42 89 l6 -10 l4 10 z M58 89 l-4 -10 l-4 10 z" fill="#ff9f5a" />
    </svg>
  );
}

/** Botão de narração: lê o texto em voz alta. */
export function SpeakButton({ text, label = 'Ouvir', className = 'btn secondary' }: { text: string; label?: string; className?: string }) {
  return (
    <button className={className} onClick={() => speech.say(text)} aria-label={`Ouvir: ${text}`}>
      🔊 {label}
    </button>
  );
}

/** Controle de ajustes: animação, narração, velocidade da fala. */
export function SettingsBar() {
  const [anim, setAnim] = useState(() => !prefersReducedMotion());
  const [voz, setVoz] = useState(() => speech.enabled);
  const [vel, setVel] = useState(() => speech.rate);

  useEffect(() => {
    document.documentElement.setAttribute('data-motion', anim ? 'on' : 'off');
    localStorage.setItem('fb_animacoes', anim ? '1' : '0');
  }, [anim]);

  useEffect(() => {
    speech.setEnabled(voz);
  }, [voz]);

  useEffect(() => {
    speech.setRate(vel);
  }, [vel]);

  return (
    <div className="row" style={{ gap: '.4rem' }}>
      <button className="settings-toggle" onClick={() => setAnim(!anim)} aria-pressed={!anim}>
        {anim ? '✨ Animações' : '⛔ Sem animação'}
      </button>
      <button className="settings-toggle" onClick={() => setVoz(!voz)} aria-pressed={voz}>
        {voz ? '🔊 Narração' : '🔇 Narração'}
      </button>
      {voz && (
        <label className="settings-toggle" style={{ cursor: 'pointer' }}>
          🐢 {Math.round(vel * 100)}%
          <input
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={vel}
            onChange={(e) => setVel(Number(e.target.value))}
            style={{ width: 80, padding: 0, border: 'none' }}
            aria-label="Velocidade da narração"
          />
        </label>
      )}
    </div>
  );
}

/** Botão que fala e oferece o áudio enviado pela fonoaudióloga. */
export function AudioButton({ word, audioSrc }: { word: string; audioSrc?: string | null }) {
  const [tocando, setTocando] = useState(false);
  return (
    <button
      className="btn sun"
      onClick={() => {
        if (audioSrc) {
          speech.play(audioSrc);
          setTocando(true);
          setTimeout(() => setTocando(false), 1200);
        } else {
          speech.say(word);
        }
      }}
    >
      {tocando ? '🔁 Ouvindo...' : '🔊 Ouvir a palavra'}
    </button>
  );
}

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: '.8rem' }}>
          <strong>Fubá</strong>
          <button className="btn ghost small" onClick={onClose}>Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Emojis para figuras sem imagem cadastrada (materiais próprios da fono). */
export const EMOJI_FALLBACK: Record<string, string> = {
  sol: '☀️', sapo: '🐸', casa: '🏠', mesa: '🪑', asa: '🪽', passaro: '🐦',
  arara: '🦜', carro: '🚗', rato: '🐭', girafa: '🦒', cor: '🎨', lua: '🌙',
  bola: '⚽', leite: '🥛', elefante: '🐘', chave: '🔑', guarda: '🧤', sorvete: '🍦',
  zebra: '🦓', gelo: '🧊', cozinha: '🍳', tomate: '🍅', uva: '🍇', hospital: '🏥',
  mala: '🧳', Cardoso: '💌',
};

export function emojiFor(word?: string): string {
  if (!word) return '🖼️';
  return EMOJI_FALLBACK[word.toLowerCase()] ?? '🖼️';
}