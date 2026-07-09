# 🎲 Shuffle Music SD

App de desktop simples que **baralha as músicas de um cartão SD** adicionando um
número aleatório à frente de cada nome. Ideal para colunas Bluetooth que leem o
cartão por ordem alfabética e **não têm botão de shuffle**.

Corres a app uma vez por dia, carregas num botão, e a ordem das músicas muda —
sem nunca estragar os nomes originais.

## Como funciona

Muitas colunas Bluetooth baratas com leitor de cartão SD **não tocam por ordem
alfabética** — tocam pela **ordem física** em que os ficheiros foram escritos no
cartão (a ordem da tabela FAT). Por isso renomear as músicas não muda nada.

Esta app resolve isso **reordenando fisicamente** as músicas no cartão:

- Move as músicas para uma pasta temporária dentro do próprio cartão e volta a
  pô-las na raiz por **ordem aleatória**. Isto muda a ordem física (FAT) sem
  recopiar a música em si — por isso é rápido e suave para o cartão.
- Os **nomes ficam limpos** (sem números), com o nome original.
- Nenhuma música se perde: se a operação for interrompida, na vez seguinte a app
  recupera automaticamente o que ficou na pasta temporária.

> Também existe o botão **Restaurar nomes originais**, que remove quaisquer
> números que tenham ficado de versões antigas.

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
