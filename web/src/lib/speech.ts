/**
 * Narração e sons da interface infantil.
 * Usa a Web Speech API do navegador (offline, sem depender de serviço externo).
 * Nenhum áudio de modelo clínico é gerado: o áudio de referência é enviado
 * pela fonoaudióloga na biblioteca de materiais.
 */

let enabled = localStorage.getItem('fb_voz') !== '0';
let rate = Number(localStorage.getItem('fb_voz_velocidade') ?? '0.85');
let voice: SpeechSynthesisVoice | null = null;

if ('speechSynthesis' in window) {
  const pick = () => {
    const voices = speechSynthesis.getVoices();
    voice = voices.find((v) => v.lang.startsWith('pt') && v.localService) ?? voices.find((v) => v.lang.startsWith('pt')) ?? null;
  };
  pick();
  speechSynthesis.onvoiceschanged = pick;
}

export const speech = {
  get enabled() {
    return enabled;
  },
  setEnabled(v: boolean) {
    enabled = v;
    localStorage.setItem('fb_voz', v ? '1' : '0');
    if (!v) speechSynthesis?.cancel();
  },
  get rate() {
    return rate;
  },
  setRate(r: number) {
    rate = r;
    localStorage.setItem('fb_voz_velocidade', String(r));
  },
  /** Lê um texto em voz alta (narração de apoio). */
  say(text: string, opts: { rate?: number } = {}) {
    if (!enabled || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = opts.rate ?? rate;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  },
  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
  /** Reproduz um áudio enviado pela profissional. */
  play(src?: string | null) {
    if (!src) {
      return false;
    }
    const a = new Audio(src);
    a.play().catch(() => {});
    return true;
  },
};

export function prefersReducedMotion(): boolean {
  return (
    localStorage.getItem('fb_animacoes') === '0' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}