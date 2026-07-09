'use strict';

// SOLUÇÃO FINAL (v3.0) para colunas que tocam pela ordem física do cartão.
//
// Descoberta-chave: no macOS, a ordem física (FAT) em que a coluna lê as músicas
// é a ordem por que os ficheiros foram COPIADOS para o cartão. Renomear ou mover
// não muda nada, mas copiar de novo muda. E copiar ficheiros é uma operação que
// o macOS permite sem palavra-passe nem acesso especial ao disco.
//
// Fluxo: guardar uma cópia de segurança de todas as músicas -> apagá-las do
// cartão -> voltar a copiá-las por ordem aleatória. A ordem por que as copiamos
// passa a ser a ordem por que a coluna toca.

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { AUDIO_EXTS } = require('./shuffle');

const MANIFEST = '.manifest.json';

function isAudio(dir, name) {
  if (name.startsWith('.')) return false;
  let stat;
  try {
    stat = fs.statSync(path.join(dir, name));
  } catch {
    return false;
  }
  return stat.isFile() && AUDIO_EXTS.has(path.extname(name).toLowerCase());
}

function listAudio(dir) {
  return fs.readdirSync(dir).filter((n) => isAudio(dir, n));
}

// Apaga o "lixo" que o macOS cria nos cartões FAT (._ficheiro e .DS_Store).
function cleanMacJunk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('._') || name === '.DS_Store') {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch {
        /* ignora */
      }
    }
  }
}

async function copyData(src, dest) {
  // Copia só os dados do ficheiro (sem metadados) — evita ficheiros ._ extra.
  await fsp.writeFile(dest, await fsp.readFile(src));
  const s = (await fsp.stat(src)).size;
  const d = (await fsp.stat(dest)).size;
  if (s !== d) throw new Error(`Cópia incompleta de ${path.basename(src)} (${d}/${s} bytes).`);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Recupera de uma execução interrompida: se houver cópia de segurança com
// músicas que já não estão no cartão, devolve-as. Protege contra perda de dados.
// Só age se a cópia pertencer a ESTE cartão (verifica o manifesto).
async function recover(cardDir, backupDir) {
  const manifestPath = path.join(backupDir, MANIFEST);
  if (!fs.existsSync(manifestPath)) return { recovered: 0 };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return { recovered: 0 };
  }
  if (manifest.cardDir && manifest.cardDir !== cardDir) return { recovered: 0 };

  let recovered = 0;
  for (const f of manifest.files || []) {
    const onCard = path.join(cardDir, f);
    const inBackup = path.join(backupDir, f);
    if (!fs.existsSync(onCard) && fs.existsSync(inBackup)) {
      await copyData(inBackup, onCard);
      recovered++;
    }
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
  return { recovered };
}

// Reordena fisicamente as músicas do cartão por cópia.
// options: { backupDir, onProgress }
async function reorderByCopy(cardDir, options = {}) {
  const { backupDir, onProgress = () => {} } = options;
  if (!backupDir) throw new Error('backupDir é obrigatório.');

  if (!fs.existsSync(cardDir) || !fs.statSync(cardDir).isDirectory()) {
    throw new Error('A pasta do cartão não existe.');
  }

  // Se sobrou uma cópia de segurança de antes, recupera primeiro.
  await recover(cardDir, backupDir);

  const files = listAudio(cardDir);
  if (files.length === 0) {
    return { count: 0, order: [], message: 'Nenhuma música encontrada nesta pasta.' };
  }

  // 1. Cópia de segurança de todas as músicas (com verificação de tamanho).
  fs.mkdirSync(backupDir, { recursive: true });
  for (let i = 0; i < files.length; i++) {
    await copyData(path.join(cardDir, files[i]), path.join(backupDir, files[i]));
    onProgress({ phase: 'backup', done: i + 1, total: files.length });
  }
  fs.writeFileSync(
    path.join(backupDir, MANIFEST),
    JSON.stringify({ cardDir, files, ts: Date.now() })
  );

  // 2. Só agora (com tudo seguro) apaga as músicas e o lixo do cartão.
  for (const f of files) fs.unlinkSync(path.join(cardDir, f));
  cleanMacJunk(cardDir);

  // 3. Ordem aleatória.
  const order = shuffleInPlace([...files]);

  // 4. Volta a copiar por essa ordem — é isto que define a ordem na coluna.
  for (let i = 0; i < order.length; i++) {
    await copyData(path.join(backupDir, order[i]), path.join(cardDir, order[i]));
    onProgress({ phase: 'restore', done: i + 1, total: order.length });
  }

  // 5. Limpa o lixo que o macOS criou durante a cópia.
  cleanMacJunk(cardDir);

  // 6. Remove a cópia de segurança.
  fs.rmSync(backupDir, { recursive: true, force: true });

  return {
    count: order.length,
    order,
    message: `${order.length} músicas reordenadas no cartão.`,
  };
}

module.exports = { listAudio, cleanMacJunk, recover, reorderByCopy };
