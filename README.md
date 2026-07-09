# 🎲 Shuffle Music SD

App desktop simples que **baralha as músicas de um cartão SD** adicionando um
número aleatório à frente de cada nome. Ideal para colunas Bluetooth que leem o
cartão por ordem alfabética e **não têm botão de shuffle**.

Corres a app uma vez por dia, carregas num botão, e a ordem das músicas muda —
sem nunca estragar os nomes originais.

## Como funciona

Muitas colunas Bluetooth com leitor de cartão SD **não tocam por ordem
alfabética nem pelo nome** — tocam pela **ordem física** em que os ficheiros
estão registados na tabela FAT do cartão. Por isso renomear as músicas não muda
nada, e o computador nem sequer deixa ver essa ordem (mostra sempre por nome).

Esta app resolve isso reescrevendo diretamente a **ordem física da tabela FAT**,
usando a ferramenta [`fatsort`](https://fatsort.sourceforge.io/) (embutida na
app, não é preciso instalar nada):

- Desmonta o cartão, baralha a ordem física (`fatsort -R`) e volta a montar.
- Os **nomes ficam limpos** (sem números).
- Mostra a nova ordem real que a coluna vai tocar.
- Só funciona em cartões **FAT/FAT32** (o exFAT não é suportado).

> Como mexer diretamente no cartão exige permissões, a app pede a tua
> **palavra-passe do Mac** de cada vez. Existe também o botão **Restaurar nomes
> originais**, que remove quaisquer números que tenham ficado de versões antigas.

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
