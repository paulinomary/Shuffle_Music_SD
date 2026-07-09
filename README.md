# 🎲 Shuffle Music SD

App de desktop simples que **baralha as músicas de um cartão SD** adicionando um
número aleatório à frente de cada nome. Ideal para colunas Bluetooth que leem o
cartão por ordem alfabética e **não têm botão de shuffle**.

Corres a app uma vez por dia, carregas num botão, e a ordem das músicas muda —
sem nunca estragar os nomes originais.

## Como funciona

- Cada música fica com um número à frente: `042 Nome da Música.mp3`.
- Antes de pôr o número novo, o número do dia anterior é removido.
- Os **nomes originais** ficam guardados numa base de dados escondida no próprio
  cartão (`.shuffle_music_db.json`), por isso nunca se perdem.
- Se adicionares músicas novas ao cartão, na próxima vez também entram no sorteio.

## Usar

Precisas do [Node.js](https://nodejs.org) instalado (versão 18 ou superior).

```bash
npm install      # instala o Electron (só a primeira vez)
npm start        # abre a aplicação
```

Na app:
1. Carrega em **Escolher…** e seleciona a pasta do cartão SD.
2. Carrega em **Baralhar músicas**.
3. Pronto — a ordem foi trocada. Ejeta o cartão e mete na coluna.

## Criar um instalador (.dmg / .exe)

Para teres um ficheiro que abre com duplo-clique, sem terminal:

```bash
npm run dist
```

O instalador aparece na pasta `dist/`.

## Testes

```bash
npm test
```

## Extensões de áudio suportadas

`.mp3` `.wav` `.flac` `.m4a` `.aac` `.wma` `.ogg` `.opus` `.aiff` `.alac`
