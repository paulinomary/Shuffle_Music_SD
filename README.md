# 🎲 Shuffle Music SD

App desktop simples que **baralha as músicas de um cartão SD** adicionando um
número aleatório à frente de cada nome. Ideal para colunas Bluetooth que leem o
cartão por ordem alfabética e **não têm botão de shuffle**.

Corres a app uma vez por dia, carregas num botão, e a ordem das músicas muda —
sem nunca estragar os nomes originais.

## Como funciona

Muitas colunas Bluetooth com leitor de cartão SD **não tocam por ordem
alfabética nem pelo nome** — tocam pela **ordem física** em que os ficheiros
foram escritos no cartão. Por isso renomear ou mover as músicas não muda nada.

Descoberta-chave: no macOS, essa ordem física é a ordem por que os ficheiros são
**copiados** para o cartão. Então a app:

1. Guarda uma cópia de segurança de todas as músicas.
2. Apaga-as do cartão.
3. Volta a copiá-las por **ordem aleatória**.

A ordem por que são copiadas passa a ser a ordem por que a coluna toca. Vantagens:

- Não precisa de palavra-passe nem de acesso especial — é só copiar ficheiros.
- Os **nomes ficam limpos** (sem números).
- Limpa o lixo que o macOS cria nos cartões FAT (ficheiros `._` e `.DS_Store`).
- À prova de falhas: se for interrompida, na vez seguinte recupera as músicas da
  cópia de segurança (nada se perde).

> Como copia todas as músicas, pode demorar alguns minutos. Não retires o cartão
> durante o processo.

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
