'use strict';

const folderEl = document.getElementById('folder');
const countEl = document.getElementById('count');
const pickBtn = document.getElementById('pick');
const shuffleBtn = document.getElementById('shuffle');
const resultEl = document.getElementById('result');

let currentFolder = null;

function setFolder(folder) {
  currentFolder = folder;
  if (folder) {
    folderEl.textContent = folder;
    folderEl.classList.remove('muted');
    shuffleBtn.disabled = false;
    refreshCount();
  } else {
    folderEl.textContent = 'Nenhuma pasta escolhida';
    folderEl.classList.add('muted');
    shuffleBtn.disabled = true;
    countEl.textContent = '';
  }
}

async function refreshCount() {
  if (!currentFolder) return;
  const n = await window.api.countAudio(currentFolder);
  countEl.textContent =
    n === 0 ? 'Nenhuma música encontrada aqui.' : `${n} música(s) encontrada(s).`;
}

pickBtn.addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) setFolder(folder);
});

shuffleBtn.addEventListener('click', async () => {
  if (!currentFolder) return;
  shuffleBtn.disabled = true;
  const original = shuffleBtn.textContent;
  shuffleBtn.innerHTML = '<span class="spinner"></span>A baralhar…';
  resultEl.className = 'result hidden';

  const res = await window.api.shuffle(currentFolder);

  shuffleBtn.textContent = original;
  shuffleBtn.disabled = false;

  if (!res.ok) {
    showResult('err', 'Erro', res.error || 'Algo correu mal.');
    return;
  }

  if (res.count === 0) {
    showResult('err', 'Sem músicas', res.message);
    return;
  }

  const list = res.changes
    .slice()
    .sort((a, b) => a.to.localeCompare(b.to))
    .map((c) => `<li>${escapeHtml(c.to)}</li>`)
    .join('');

  showResult('ok', '✅ Pronto!', res.message, `<ul>${list}</ul>`);
  refreshCount();
});

function showResult(kind, title, message, extraHtml = '') {
  resultEl.className = `result ${kind}`;
  resultEl.innerHTML = `<h3>${title}</h3><div>${escapeHtml(message)}</div>${extraHtml}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Ao abrir, tenta recuperar a última pasta usada.
(async () => {
  const last = await window.api.getLastFolder();
  if (last) setFolder(last);
})();
