# Guia de Materiais — FalaBrincando

Este guia explica **o que subir**, **como nomear** e **o que acontece** quando você envia
cada tipo de arquivo na aba **Materiais**.

---

## 1. Como funciona a troca (o mais importante)

Hoje os jogos mostram **emojis provisórios**. A partir de agora, quando você enviar uma
imagem, ela **substitui o emoji automaticamente** em todos os jogos.

```
sem imagem enviada  ->  mostra o emoji   🐸
com imagem aprovada ->  mostra a sua imagem
```

O sistema casa pelo **nome do material**. Não precisa ligar imagem por imagem em cada
atividade — basta enviar uma vez.

---

## 2. Qual é o "nome" que importa

O campo **Título** do material é a chave que casa com a palavra do jogo.

| Você escreve no Título | Casa com a palavra |
|---|---|
| `Sol` | sol |
| `sol` | sol |
| `Guarda-chuva` | guarda-chuva |
| `GuardaChuva` | guarda-chuva |
| `Leite` | leite |

Regras:

- **Maiúsculas e minúsculas não importam.**
- **Acentos não importam** — `coração` e `coracao` são a mesma figura.
- **Hífen e espaço não importam** — `guarda-chuva`, `guarda chuva` e `guardachuva` são a mesma.
- O nome deve ser **a palavra em português**. Um nome inventado (`figura01`) não casa.

> Para saber **exatamente** quais palavras existem no seu sistema:
>
> ```
> npm run db:palavras
> ```
>
> Sai a lista de todas as palavras dos fonemas e das atividades, com a origem de cada uma.
> Use `npm run db:palavras s` para filtrar só as que começam com **s**.

---

## 3. Passo a passo para subir

1. Fonoaudióloga → **Materiais** → **Enviar material**
2. Escolher o **tipo** (imagem, áudio, vídeo, PDF ou ficha)
3. Escrever o **Título = a palavra** (ex.: `sapo`)
4. Escolher o **arquivo**
5. **Salvar** — o material entra como **"em revisão"**
6. Clicar em **Aprovar** — só depois disso a criança vê

> ⚠️ **A aprovação é obrigatória por segurança (LGPD).** Nada aprovado vai para a criança
> sem a sua autorização.

Para **trocar** a figura de uma palavra: envie outra imagem com o **mesmo título** e
aprove. A mais recente passa a valer. Para **voltar ao emoji**: exclua o material.

---

## 4. O que subir de cada tipo

### 🖼️ Imagem (`kind: imagem`) — **substitui o emoji**

É o tipo que troca a figura dos jogos.

| Campo | O que colocar |
|---|---|
| **Título** | A palavra, ex.: `sapo` |
| **Formato** | PNG ou JPG |
| **Tamanho** | até 1 MB por arquivo |
| **Proporção** | quadrada, com o desenho centralizado e fundo claro |
| **Nomes de arquivo** | não importam; o que vale é o Título |

**Qualidade sugerida:** 600 × 600 px, fundo branco ou pastel, desenho grande e sem texto.

Exemplos de títulos que o sistema já reconhece:

| Tema | Títulos |
|---|---|
| Fonema **S** | `sol`, `sapo`, `asa`, `casa`, `mesa`, `passaro`, `zebra`, `cozinha`, `gelo` |
| Fonema **R** | `arara`, `carro`, `rato`, `girafa`, `cor`, `barco` |
| Fonema **L** | `lua`, `bola`, `leite`, `elefante`, `limao` |
| Fonema **X** | `chave`, `taxi`, `saxofone`, `maxixe` |
| Fonema **LH** | `coelho`, `filho`, `ilha`, `palha` |

> Figuras que **não são palavras** (respostas como "no lago") continuam usando emoji.

### 🔊 Áudio (`kind: audio`)

| Campo | O que colocar |
|---|---|
| **Título** | a palavra falada, ex.: `sol` |
| **Formato** | MP3 ou M4A |
| **Duração** | curta (1 a 3 segundos) — é só a palavra |
| **Ambiente** | silencioso, sem música de fundo |

Áudio é usado quando você quer que a criança **ouça a palavra** com a sua voz.
O app já tem voz sintética (o navegador lê a palavra); o áudio é para quando a
gravação da fono for preferível — por exemplo, para **modelar** o som da palavra
para a criança repetir.

### 🎬 Vídeo (`kind: video`)

| Campo | O que colocar |
|---|---|
| **Título** | o nome do material, ex.: `modelo-s` |
| **Formato** | MP4 (H.264) |
| **Duração** | até 60 segundos |
| **Conteúdo** | a fono falando o som, ou a criança tentando |

Vídeos servem como **modelo de referência** e para a família mostrar como fazer.
Não entra nos jogos automaticamente — é material de consulta.

### 📄 PDF (`kind: pdf`)

| Campo | O que colocar |
|---|---|
| **Título** | ex.: `ficha-s-rima` |
| **Formato** | PDF |
| **Uso** | fichas de atividades para imprimir |

PDFs **não entram nos jogos** — servem para imprimir e levar para a sessão.

### 📝 Ficha (`kind: ficha`)

Registro em texto de uma atividade planejada (texto, objetivo, materiais).
É o formato mais leve, para anotações rápidas da fono.

---

## 5. Sugestão de nomes de arquivo no seu computador

O nome do arquivo em disco **não** importa para o sistema, mas ajuda a você se
organizar. Sugestão:

```
s_sol.png
s_sapo.png
s_asa.png
r_arara.png
l_lua.png
x_chave.png
lh_coelho.png
```

Padrão: `fonema_palavra.ext`. Assim, ao abrir a pasta, você acha tudo por fonema.

---

## 6. Regras técnicas (para quem prepara os arquivos)

| Item | Regra |
|---|---|
| Imagem | PNG/JPG/WebP, até 1 MB, 600×600 px recomendado |
| Áudio | MP3/M4A, até 5 MB |
| Vídeo | MP4 H.264, até 20 MB |
| PDF | até 10 MB |
| Nome | sem acento é mais seguro; `sol.png`, `sapo.jpg` |

---

## 7. O que fazer se a imagem não aparecer

| Sintoma | Causa provável | Solução |
|---|---|---|
| Continua o emoji | material está **"em revisão"** | clique em **Aprovar** |
| Continua o emoji | o Título não bate com a palavra | confira a tabela da seção 2 |
| Só funciona para você | o navegador guardou a lista antiga | **recarregue a página** (Ctrl+F5) |
| Imagem sai "estranha" | arquivo muito grande ou formato raro | envie PNG até 1 MB |
| Some depois | material excluído ou reprovado | veja o status na lista |

---

## 8. Privacidade

- Cada fono tem a **sua própria pasta** de arquivos. Ninguém vê o material de outra
  profissional.
- Responsável só acessa figuras de fonos **ligadas ao seu filho**.
- Arquivos **não aprovados** nunca chegam à criança.
- Nenhum dado de paciente é enviado em material.

---

## 9. Resumo em uma frase

> **Envie a imagem com o Título igual à palavra, aprove, e o emoji vira a sua figura
> em todos os jogos.**