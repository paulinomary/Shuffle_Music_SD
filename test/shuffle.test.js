'use strict';

// Teste simples do motor, sem precisar do Electron.
// Cria uma pasta temporária com músicas falsas e verifica o comportamento.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const {
  shuffleFolder,
  restoreOriginals,
  physicalShuffle,
  listAudioFiles,
  listAudioFilesRaw,
  loadDb,
  DB_FILE,
  REORDER_TMP,
} = require('../src/shuffle');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

function makeTempDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shuffle-test-'));
  for (const f of files) fs.writeFileSync(path.join(dir, f), 'fake');
  return dir;
}

function currentNames(dir) {
  return listAudioFiles(dir).sort();
}

console.log('A correr testes do motor de shuffle...\n');

test('adiciona prefixo numérico a todas as músicas', () => {
  const dir = makeTempDir(['Musica A.mp3', 'Outra.mp3', 'Terceira.flac']);
  const res = shuffleFolder(dir);
  assert.strictEqual(res.count, 3);
  for (const name of currentNames(dir)) {
    assert.ok(/^\d{3} /.test(name), `esperava prefixo em: ${name}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('preserva os nomes originais na base de dados', () => {
  const dir = makeTempDir(['Bohemian Rhapsody.mp3', 'Imagine.mp3']);
  shuffleFolder(dir);
  const db = loadDb(dir);
  const originals = Object.values(db).sort();
  assert.deepStrictEqual(originals, ['Bohemian Rhapsody.mp3', 'Imagine.mp3']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('correr várias vezes NÃO acumula números (nome original mantém-se)', () => {
  const dir = makeTempDir(['Song One.mp3', 'Song Two.mp3', 'Song Three.mp3']);
  shuffleFolder(dir);
  shuffleFolder(dir);
  shuffleFolder(dir);
  const originals = Object.values(loadDb(dir)).sort();
  assert.deepStrictEqual(originals, ['Song One.mp3', 'Song Three.mp3', 'Song Two.mp3']);
  // Nenhum nome deve ter dois prefixos tipo "005 003 ..."
  for (const name of currentNames(dir)) {
    assert.ok(!/^\d{3} \d{3} /.test(name), `prefixo acumulado em: ${name}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('músicas novas adicionadas depois também são incluídas', () => {
  const dir = makeTempDir(['A.mp3', 'B.mp3']);
  shuffleFolder(dir);
  fs.writeFileSync(path.join(dir, 'C Nova.mp3'), 'fake');
  const res = shuffleFolder(dir);
  assert.strictEqual(res.count, 3);
  const originals = Object.values(loadDb(dir)).sort();
  assert.deepStrictEqual(originals, ['A.mp3', 'B.mp3', 'C Nova.mp3']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ignora ficheiros que não são música e a própria base de dados', () => {
  const dir = makeTempDir(['Song.mp3', 'foto.jpg', 'notas.txt']);
  shuffleFolder(dir);
  const audio = currentNames(dir);
  assert.strictEqual(audio.length, 1);
  assert.ok(fs.existsSync(path.join(dir, DB_FILE)));
  assert.ok(fs.existsSync(path.join(dir, 'foto.jpg')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('pasta sem músicas devolve contagem 0 sem erro', () => {
  const dir = makeTempDir(['leiame.txt']);
  const res = shuffleFolder(dir);
  assert.strictEqual(res.count, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('restaurar remove os números e deixa os nomes originais', () => {
  const dir = makeTempDir(['Bohemian Rhapsody.mp3', 'Imagine.mp3', 'Hotel California.mp3']);
  shuffleFolder(dir);
  // depois do shuffle têm prefixos
  assert.ok(currentNames(dir).every((n) => /^\d{3} /.test(n)));
  const res = restoreOriginals(dir);
  assert.strictEqual(res.count, 3);
  assert.deepStrictEqual(currentNames(dir), [
    'Bohemian Rhapsody.mp3',
    'Hotel California.mp3',
    'Imagine.mp3',
  ]);
  // a base de dados é apagada porque já não há prefixos
  assert.ok(!fs.existsSync(path.join(dir, DB_FILE)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('restaurar funciona mesmo sem base de dados (usa o plano B)', () => {
  const dir = makeTempDir(['001 Song A.mp3', '002 Song B.mp3']);
  // apaga a DB se existir para forçar o fallback
  try {
    fs.unlinkSync(path.join(dir, DB_FILE));
  } catch {}
  restoreOriginals(dir);
  assert.deepStrictEqual(currentNames(dir), ['Song A.mp3', 'Song B.mp3']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('listAudioFilesRaw devolve a ordem física (não alfabética)', () => {
  const dir = makeTempDir(['A.mp3']);
  fs.writeFileSync(path.join(dir, 'Z.mp3'), 'x');
  const raw = listAudioFilesRaw(dir);
  assert.strictEqual(raw.length, 2);
  assert.ok(raw.includes('A.mp3') && raw.includes('Z.mp3'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('physicalShuffle mantém todas as músicas com nome original e conteúdo intacto', () => {
  const dir = makeTempDir([]);
  const songs = { 'A.mp3': 'aaa', 'B.mp3': 'bbb', 'C.mp3': 'ccc', 'D.mp3': 'ddd' };
  for (const [n, c] of Object.entries(songs)) fs.writeFileSync(path.join(dir, n), c);
  const res = physicalShuffle(dir);
  assert.strictEqual(res.count, 4);
  assert.deepStrictEqual(currentNames(dir), Object.keys(songs).sort());
  for (const [n, c] of Object.entries(songs)) {
    assert.strictEqual(fs.readFileSync(path.join(dir, n), 'utf8'), c);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('physicalShuffle não deixa pasta temporária nem base de dados', () => {
  const dir = makeTempDir(['X.mp3', 'Y.mp3']);
  physicalShuffle(dir);
  assert.ok(!fs.existsSync(path.join(dir, REORDER_TMP)));
  assert.ok(!fs.existsSync(path.join(dir, DB_FILE)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('physicalShuffle recupera músicas de uma pasta temporária interrompida', () => {
  const dir = makeTempDir(['Song1.mp3']);
  // simula uma falha a meio: uma música ficou na pasta temporária
  const tmp = path.join(dir, REORDER_TMP);
  fs.mkdirSync(tmp);
  fs.writeFileSync(path.join(tmp, '0_Song2.mp3'), 'preso');
  physicalShuffle(dir);
  // a Song2 tem de voltar à raiz, nada se perde
  assert.deepStrictEqual(currentNames(dir), ['Song1.mp3', 'Song2.mp3']);
  assert.ok(!fs.existsSync(tmp));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('physicalShuffle com keepNumbers adiciona prefixos e guarda a base de dados', () => {
  const dir = makeTempDir(['Um.mp3', 'Dois.mp3', 'Tres.mp3']);
  physicalShuffle(dir, { keepNumbers: true });
  assert.ok(currentNames(dir).every((n) => /^\d{3} /.test(n)));
  assert.ok(fs.existsSync(path.join(dir, DB_FILE)));
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(`\n${passed} teste(s) passaram.`);
