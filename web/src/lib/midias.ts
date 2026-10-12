/**
 * MÍDIA: busca os materiais aprovados (imagem/áudio) e devolve o endereço
 * do arquivo. É a base da troca "emoji -> figura sua" e "voz do navegador -> voz da fono".
 *
 * - O índice é carregado uma vez e guardado em memória.
 * - Cada arquivo é baixado uma única vez; o endereço temporário fica em cache.
 * - Chave de casamento: o TÍTULO do material sem acento, sem espaço e sem hífen.
 *   "Sol", "sol" e "SOL" são a mesma figura.
 */
import { useEffect, useState } from 'react';
import { api, auth } from './api';

export type MidiaItem = { id: number; chave: string; kind: string; url: string };

/** Índice: chave normalizada -> { imagem?, audio? } (mesma palavra pode ter os dois). */
let indice: Map<string, Partial<Record<'imagem' | 'audio', MidiaItem>>> | null = null;
let carregando: Promise<void> | null = null;
/** Endereços temporários já gerados. */
const enderecos = new Map<string, string>();

const chaveDe = (p?: string | null) =>
  String(p ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Chamar depois de enviar/aprovar/excluir um material, para recarregar a lista. */
export function invalidaIndiceMidias() {
  indice = null;
  carregando = null;
  enderecos.clear();
}

export async function garantirIndice(): Promise<Map<string, Partial<Record<'imagem' | 'audio', MidiaItem>>>> {
  if (indice) return indice;
  if (!carregando) {
    carregando = api<MidiaItem[]>('/materials/catalogo/figuras')
      .then((lista) => {
        indice = new Map();
        for (const it of lista ?? []) {
          if (it.kind !== 'imagem' && it.kind !== 'audio') continue;
          const chave = it.chave || chaveDe(String(it.id));
          if (!chave) continue;
          const slot = indice.get(chave) ?? {};
          // uma imagem e um áudio podem ter o mesmo título; ambos são válidos
          if (!slot[it.kind]) slot[it.kind] = it;
          indice.set(chave, slot);
        }
      })
      .catch(() => {
        indice = new Map();
      });
  }
  await carregando;
  return indice!;
}

/** Material (imagem ou áudio) da palavra, se existir. */
export async function materialDaPalavra(
  palavra: string | null | undefined,
  kind: 'imagem' | 'audio'
): Promise<MidiaItem | undefined> {
  const chave = chaveDe(palavra);
  if (!chave) return undefined;
  const mapa = await garantirIndice();
  return mapa.get(chave)?.[kind];
}

/** Endereço utilizável em <img>/<audio>. Busca o arquivo uma única vez. */
export async function enderecoDoMaterial(item: MidiaItem): Promise<string | undefined> {
  const jaTem = enderecos.get(item.url);
  if (jaTem) return jaTem;
  try {
    const res = await fetch(`/api${item.url}`, {
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (!res.ok) return undefined;
    const url = URL.createObjectURL(await res.blob());
    enderecos.set(item.url, url);
    return url;
  } catch {
    return undefined;
  }
}

/** Endereço pronto de uma palavra, do tipo pedido (undefined se não houver). */
export async function enderecoDaPalavra(
  palavra: string | null | undefined,
  kind: 'imagem' | 'audio'
): Promise<string | undefined> {
  const item = await materialDaPalavra(palavra, kind);
  return item ? enderecoDoMaterial(item) : undefined;
}

/** Versão síncrona: só devolve se o arquivo já foi baixado antes. */
export function enderecoConhecido(palavra: string | null | undefined, kind: 'imagem' | 'audio') {
  const chave = chaveDe(palavra);
  if (!chave || !indice) return undefined;
  const item = indice.get(chave)?.[kind];
  return item ? enderecos.get(item.url) : undefined;
}

/**
 * Endereço do áudio da palavra, se a fono tiver enviado.
 * Usado no botão "Ouvir": tem a voz da fono ou, na falta, a do navegador.
 */
export function useAudioDaPalavra(word?: string | null): string | undefined {
  const chave = chaveDe(word);
  const [src, setSrc] = useState<string | undefined>(() => enderecoConhecido(chave, 'audio'));

  useEffect(() => {
    let vivo = true;
    if (!chave) {
      setSrc(undefined);
      return;
    }
    enderecoDaPalavra(chave, 'audio').then((url) => {
      if (vivo) setSrc(url);
    });
    return () => {
      vivo = false;
    };
  }, [chave]);

  return src;
}