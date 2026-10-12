/**
 * FIGURAS: usa a imagem/áudio que a fonoaudióloga enviou na aba Materiais.
 *
 * Como funciona:
 *  1. Carrega a lista de materiais aprovados (GET /api/materials/catalogo/figuras).
 *  2. Casa pelo TÍTULO do material, sem acento e sem espaços
 *     (material "guarda-chuva" serve para a palavra "guardachuva").
 *  3. Descarrega o arquivo uma única vez e guarda o endereço temporário em memória.
 *  4. Se não houver material, cai no emoji provisório (emojiFor).
 *
 * Ou seja: subir a imagem na aba Materiais com o nome da palavra
 * substitui o emoji automaticamente, em todos os jogos.
 */
import { useEffect, useState } from 'react';
import { api, auth } from '../lib/api';
import { emojiFor, normalizar } from './ui';

type Item = { id: number; chave: string; kind: string; url: string };

/** Índice global: chave normalizada -> material aprovado. */
let indice: Map<string, Item> | null = null;
let indicePromise: Promise<void> | null = null;
/** Endereços temporários já gerados (evita baixar a mesma imagem duas vezes). */
const blobs = new Map<string, string>();

export function invalidaIndiceFiguras() {
  indice = null;
  indicePromise = null;
}

async function garantirIndice() {
  if (indicePromise) return indicePromise;
  indicePromise = api<Item[]>('/materials/catalogo/figuras')
    .then((lista) => {
      indice = new Map<string, Item>();
      for (const it of lista) if (it.chave && !indice.has(it.chave)) indice.set(it.chave, it);
    })
    .catch(() => {
      indice = new Map();
    });
  return indicePromise;
}

/** Baixa o arquivo com o token e devolve um endereço utilizável em <img>. */
async function endereco(item: Item): Promise<string | undefined> {
  const jaTem = blobs.get(item.chave);
  if (jaTem) return jaTem;
  try {
    const res = await fetch(`/api${item.url}`, {
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (!res.ok) return undefined;
    const url = URL.createObjectURL(await res.blob());
    blobs.set(item.chave, url);
    return url;
  } catch {
    return undefined;
  }
}

/**
 * Desenha a figura de uma palavra: imagem enviada pela fono ou emoji provisório.
 * `className` e `style` são repassados para o elemento (ícone ou <img>).
 */
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
    chave ? blobs.get(chave) : undefined
  );

  useEffect(() => {
    let vivo = true;
    if (!chave) {
      setSrc(undefined);
      return;
    }
    const jaTem = blobs.get(chave);
    if (jaTem) {
      setSrc(jaTem);
      return;
    }
    (async () => {
      await garantirIndice();
      const item = indice?.get(chave);
      if (!item || item.kind !== 'imagem') return;
      const url = await endereco(item);
      if (vivo) setSrc(url);
    })();
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