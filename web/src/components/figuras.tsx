/**
 * FIGURAS: mostra a imagem enviada pela fonoaudióloga (aba Materiais)
 * e cai no emoji provisório quando não houver imagem.
 *
 * Troca automática: subir a imagem com o Título = a palavra já vale,
 * sem precisar ligar figura por figura em cada atividade.
 */
import { useEffect, useState } from 'react';
import { enderecoDaPalavra, enderecoConhecido } from '../lib/midias';
import { emojiFor, normalizar } from './ui';

export function Figura({
  word,
  className,
  style,
  alt,
}: {
  word?: string | null;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}) {
  const chave = normalizar(word ?? '');
  const [src, setSrc] = useState<string | undefined>(() =>
    chave ? enderecoConhecido(chave, 'imagem') : undefined
  );

  useEffect(() => {
    let vivo = true;
    if (!chave) {
      setSrc(undefined);
      return;
    }
    const jaTem = enderecoConhecido(chave, 'imagem');
    if (jaTem) {
      setSrc(jaTem);
      return;
    }
    enderecoDaPalavra(chave, 'imagem').then((url) => {
      if (vivo) setSrc(url);
    });
    return () => {
      vivo = false;
    };
  }, [chave]);

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? word ?? 'figura'}
        className={className}
        style={{ objectFit: 'contain', maxWidth: '100%', ...style }}
        draggable={false}
      />
    );
  }
  return (
    <span className={className} style={style} role="img" aria-label={alt ?? word ?? 'figura'}>
      {emojiFor(word ?? undefined)}
    </span>
  );
}
