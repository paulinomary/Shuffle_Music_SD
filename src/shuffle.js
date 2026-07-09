'use strict';

// Motor da aplicação: renomeia as músicas de uma pasta (cartão SD) adicionando
// um número aleatório à frente, sem estragar os nomes originais.
//
// Ideias-chave:
//  - Guarda uma "base de dados" (ficheiro escondido) com o nome ORIGINAL de cada
//    música. Assim, mesmo correndo todos os dias, nunca perdemos o nome verdadeiro.
//  - Antes de pôr o número novo, remove o número do dia anterior.
//  - A ordem é aleatória (Fisher-Yates) para nunca ficar sempre igual.

const fs = require('fs');
const path = require('path');

// Extensões de áudio que consideramos "músicas".
const AUDIO_EXTS = new Set([
  '.mp3', '.wav', '.flac', '.m4a', '.aac', '.wma', '.ogg', '.opus', '.aiff', '.alac',
]);

// Nome do ficheiro-base-de-dados escondido, guardado dentro do próprio cartão.
const DB_FILE = '.shuffle_music_db.json';

// Deteta um prefixo de número que nós próprios tenhamos posto antes.
// Ex.: "042 Nome.mp3", "042_Nome.mp3", "042 - Nome.mp3".
// Usado apenas como plano B, quando a base de dados não tem o registo.
const PREFIX_RE = /^\d{2,}[\s_.\-]+/;

function isAudioFile(dir, name) {
  if (name.startsWith('.')) return false; // ignora ficheiros escondidos
  let stat;
  try {
    stat = fs.statSync(path.join(dir, name));
  } catch {
    return false;
  }
  return stat.isFile() && AUDIO_EXTS.has(path.extname(name).toLowerCase());
}

// Lista as músicas por ORDEM ALFABÉTICA (usada internamente para renomear).
function listAudioFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => isAudioFile(dir, name))
    .sort((a, b) => a.localeCompare(b));
}

// Lista as músicas pela ORDEM FÍSICA do cartão (tal como estão no diretório),
// sem ordenar. É o que mais se aproxima da ordem por que a coluna as toca.
function listAudioFilesRaw(dir) {
  return fs.readdirSync(dir).filter((name) => isAudioFile(dir, name));
}

function loadDb(dir) {
  try {
    const raw = fs.readFileSync(path.join(dir, DB_FILE), 'utf8');
    const data = JSON.parse(raw);
    if (data && data.map && typeof data.map === 'object') return data.map;
  } catch {
    // sem base de dados ainda, ou corrompida -> começamos do zero
  }
  return {};
}

function saveDb(dir, map) {
  const payload = { version: 1, updated: new Date().toISOString(), map };
  fs.writeFileSync(path.join(dir, DB_FILE), JSON.stringify(payload, null, 2));
}

// Descobre o nome original de um ficheiro que está agora no cartão.
// Primeiro pergunta à base de dados; se não souber, tira o prefixo de número.
function originalNameFor(currentName, dbMap) {
  if (dbMap[currentName]) return dbMap[currentName];
  const stripped = currentName.replace(PREFIX_RE, '');
  return stripped.length > 0 ? stripped : currentName;
}

// Baralha um array no sítio (Fisher-Yates).
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Constrói o plano de renomeação: para cada música, o nome final "NNN original".
function buildPlan(files, dbMap) {
  const items = files.map((f) => ({ current: f, original: originalNameFor(f, dbMap) }));
  shuffleInPlace(items);

  // Largura dos números para ordenar bem (mínimo 3 dígitos: 001, 002, ...).
  const width = Math.max(3, String(items.length).length);

  return items.map((it, idx) => ({
    from: it.current,
    to: `${String(idx + 1).padStart(width, '0')} ${it.original}`,
    original: it.original,
  }));
}

// Corre o processo completo numa pasta.
// options.dryRun = true -> só devolve o plano, não renomeia nada.
function shuffleFolder(dir, options = {}) {
  const { dryRun = false } = options;

  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('A pasta indicada não existe.');
  }

  const files = listAudioFiles(dir);
  if (files.length === 0) {
    return { count: 0, changes: [], message: 'Nenhuma música encontrada nesta pasta.' };
  }

  const dbMap = loadDb(dir);
  const plan = buildPlan(files, dbMap);

  if (dryRun) {
    return { count: plan.length, changes: plan, message: 'Pré-visualização (nada foi alterado).' };
  }

  // Renomeação em duas fases (via nomes temporários) para evitar colisões,
  // caso o número novo de uma música seja igual ao nome atual de outra.
  const temps = plan.map((r, i) => path.join(dir, `.shuffletmp_${i}_${Date.now()}`));
  plan.forEach((r, i) => fs.renameSync(path.join(dir, r.from), temps[i]));

  const newMap = {};
  plan.forEach((r, i) => {
    fs.renameSync(temps[i], path.join(dir, r.to));
    newMap[r.to] = r.original;
  });

  saveDb(dir, newMap);

  return {
    count: plan.length,
    changes: plan,
    message: `${plan.length} músicas baralhadas com sucesso.`,
  };
}

// Remove os números de todas as músicas, deixando só os nomes originais.
// Apaga a base de dados no fim, porque já não há prefixos para acompanhar.
function restoreOriginals(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error('A pasta indicada não existe.');
  }

  const files = listAudioFiles(dir);
  if (files.length === 0) {
    return { count: 0, changes: [], message: 'Nenhuma música encontrada nesta pasta.' };
  }

  const dbMap = loadDb(dir);

  // Calcula o nome original de cada ficheiro, evitando nomes repetidos.
  const used = new Set();
  const plan = files.map((f) => {
    let target = originalNameFor(f, dbMap);
    if (used.has(target)) {
      const ext = path.extname(target);
      const base = target.slice(0, target.length - ext.length);
      let i = 2;
      while (used.has(`${base} (${i})${ext}`)) i++;
      target = `${base} (${i})${ext}`;
    }
    used.add(target);
    return { from: f, to: target };
  });

  const changed = plan.filter((p) => p.from !== p.to);

  // Renomeação em duas fases para evitar colisões.
  const temps = changed.map((_, i) => path.join(dir, `.restoretmp_${i}_${Date.now()}`));
  changed.forEach((r, i) => fs.renameSync(path.join(dir, r.from), temps[i]));
  changed.forEach((r, i) => fs.renameSync(temps[i], path.join(dir, r.to)));

  // Já não há prefixos: a base de dados deixa de ser necessária.
  try {
    fs.unlinkSync(path.join(dir, DB_FILE));
  } catch {
    // não existia, tudo bem
  }

  return {
    count: plan.length,
    changes: plan,
    message: `${plan.length} músicas com o nome original restaurado.`,
  };
}

module.exports = {
  AUDIO_EXTS,
  DB_FILE,
  listAudioFiles,
  listAudioFilesRaw,
  loadDb,
  saveDb,
  originalNameFor,
  buildPlan,
  shuffleFolder,
  restoreOriginals,
};
