'use strict';

// Orquestra a reordenação FÍSICA do cartão com a ferramenta `fatsort`.
// Esta é a solução garantida para colunas que tocam pela ordem FAT do cartão.
//
// Passos (tudo dentro de UMA autorização de administrador):
//   1. desmontar o volume do cartão
//   2. ler a ordem física atual (fatsort -l)   -> "antes"
//   3. baralhar a ordem física (fatsort -R)
//   4. ler a nova ordem física (fatsort -l)     -> "depois"
//   5. voltar a montar o volume

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');

const execFileP = util.promisify(execFile);

// Localiza o binário fatsort: embutido na app (produção) ou no repo/sistema (dev).
function findFatsort() {
  const candidates = [];
  if (process.resourcesPath) candidates.push(path.join(process.resourcesPath, 'fatsort'));
  candidates.push(path.join(__dirname, '..', 'resources', 'fatsort'));
  candidates.push('/opt/homebrew/bin/fatsort', '/usr/local/bin/fatsort');
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      /* continua */
    }
  }
  return null;
}

// Descobre o dispositivo (/dev/diskXsY), o ponto de montagem e o tipo de FAT
// para um caminho qualquer dentro do cartão.
async function getDeviceInfo(anyPath) {
  const { stdout: dfOut } = await execFileP('df', ['-P', anyPath]);
  const lines = dfOut.trim().split('\n');
  const cols = lines[lines.length - 1].split(/\s+/);
  const device = cols[0]; // ex.: /dev/disk4s1
  const mount = cols.slice(5).join(' '); // ex.: /Volumes/NGS

  let fsType = '';
  try {
    const { stdout } = await execFileP('diskutil', ['info', device]);
    const m = stdout.match(/File System Personality:\s*(.+)/);
    if (m) fsType = m[1].trim();
  } catch {
    /* sem info */
  }
  return { device, mount, fsType };
}

// Extrai a lista de ficheiros entre dois marcadores do output do fatsort -l.
function sliceList(text, startMark, endMark) {
  const start = text.indexOf(startMark);
  const end = text.indexOf(endMark);
  if (start === -1 || end === -1) return [];
  return text
    .slice(start + startMark.length, end)
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('==='));
}

async function fatShuffle(anyPath) {
  const fatsort = findFatsort();
  if (!fatsort) {
    throw new Error('A ferramenta de reordenação (fatsort) não foi encontrada.');
  }

  const { device, mount, fsType } = await getDeviceInfo(anyPath);

  if (!/FAT/i.test(fsType)) {
    throw new Error(
      `Este cartão está formatado como "${fsType || 'desconhecido'}". ` +
        'A reordenação só funciona em cartões FAT/FAT32 (o exFAT não é suportado).'
    );
  }

  // Copia o fatsort para um caminho temporário sem espaços (evita problemas no shell).
  const tmpFatsort = path.join(os.tmpdir(), 'shuffle_fatsort');
  fs.copyFileSync(fatsort, tmpFatsort);
  fs.chmodSync(tmpFatsort, 0o755);

  const rawDevice = device.replace('/dev/disk', '/dev/rdisk');

  const scriptPath = path.join(os.tmpdir(), 'shuffle_run.sh');
  // Captura TODAS as mensagens (incluindo erros) da fatsort para diagnóstico.
  // Tenta o dispositivo normal e, se a listagem falhar, tenta o "raw".
  const script = `#!/bin/sh
export LC_ALL=C
D="${device}"
RD="${rawDevice}"
F="${tmpFatsort}"
echo "DEVICE=$D"
diskutil unmount force "$D" 2>&1 || { echo "ERRO_DESMONTAR"; diskutil mount "$D" 2>&1; exit 0; }
DEV="$D"
if [ -z "$("$F" -l "$DEV" 2>/dev/null)" ]; then DEV="$RD"; fi
echo "USANDO=$DEV"
echo "===ANTES==="
"$F" -l "$DEV" 2>/dev/null
echo "===DIAG==="
"$F" -R "$DEV" 2>&1
echo "RC_FATSORT=$?"
echo "===DEPOIS==="
"$F" -l "$DEV" 2>/dev/null
echo "===FIM==="
diskutil mount "$D" 2>&1
exit 0
`;
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });

  const osa = `do shell script "/bin/sh '${scriptPath}'" with administrator privileges`;

  let stdout;
  try {
    ({ stdout } = await execFileP('osascript', ['-e', osa], { maxBuffer: 4 * 1024 * 1024 }));
  } catch (err) {
    if (/User canceled|-128/.test(err.message)) {
      throw new Error('Cancelaste a autorização — nada foi alterado.');
    }
    throw new Error('Não foi possível correr a reordenação. Verifica que o cartão está bem ligado.');
  }

  if (/ERRO_DESMONTAR/.test(stdout)) {
    throw new Error('Não foi possível desmontar o cartão (pode estar a ser usado por outra app). Fecha o Finder/janelas do cartão e tenta de novo.');
  }

  const before = sliceList(stdout, '===ANTES===', '===DIAG===');
  const after = sliceList(stdout, '===DEPOIS===', '===FIM===');
  const diag = stdout.slice(stdout.indexOf('===DIAG===') + 10, stdout.indexOf('===DEPOIS==='))
    .split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean).join(' | ');
  const rcMatch = stdout.match(/RC_FATSORT=(\d+)/);
  const rc = rcMatch ? Number(rcMatch[1]) : -1;

  // Só é sucesso se a fatsort correu bem E ficaram músicas listadas.
  if (rc !== 0 || after.length === 0) {
    throw new Error(
      `A reordenação não deu resultado (0 músicas). Detalhe técnico: ${diag || 'sem mensagem'}.`
    );
  }

  return {
    device,
    mount,
    fsType,
    before,
    after,
    count: after.length,
    message: `${after.length} músicas reordenadas fisicamente no cartão.`,
  };
}

module.exports = { findFatsort, getDeviceInfo, fatShuffle };
