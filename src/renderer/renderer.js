'use strict';

const folderEl = document.getElementById('folder');
const countEl = document.getElementById('count');
const pickBtn = document.getElementById('pick');
const shuffleBtn = document.getElementById('shuffle');
const resultEl = document.getElementById('result');
const orderCard = document.getElementById('orderCard');
const orderList = document.getElementById('orderList');
const refreshOrderBtn = document.getElementById('refreshOrder');
const lastOrderBtn = document.getElementById('lastOrder');
const progressEl = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const shuffleBtnHTML = shuffleBtn.innerHTML;
let currentFolder = null;

function setFolder(folder) {
  currentFolder = folder;
  if (folder) {
    folderEl.textContent = folder;
    folderEl.classList.remove('muted');
    shuffleBtn.disabled = false;
    orderCard.classList.remove('hidden');
    refreshCount();
    refreshOrder();
    refreshLastOrder();
  } else {
    folderEl.textContent = 'Nenhuma pasta escolhida';
    folderEl.classList.add('muted');
    shuffleBtn.disabled = true;
    orderCard.classList.add('hidden');
    lastOrderBtn.classList.add('hidden');
    countEl.textContent = '';
  }
}

async function refreshLastOrder() {
  if (!currentFolder) {
    lastOrderBtn.classList.add('hidden');
    return;
  }
  const last = await window.api.lastOrder(currentFolder);
  const has = last && last.order && last.order.length;
  lastOrderBtn.classList.toggle('hidden', !has);
}

lastOrderBtn.addEventListener('click', async () => {
  const last = await window.api.lastOrder(currentFolder);
  if (!last || !last.order) return;
  const when = new Date(last.ts).toLocaleString('pt-PT');
  const list = last.order.map((n) => `<li><span>${escapeHtml(n)}</span></li>`).join('');
  showResult(
    'ok',
    'Última ordem baralhada',
    `Baralhado em ${when}. É esta a ordem que a coluna toca:`,
    `<ul class="order-list">${list}</ul>`
  );
});

async function refreshCount() {
  if (!currentFolder) return;
  const n = await window.api.countAudio(currentFolder);
  countEl.textContent =
    n === 0 ? 'Nenhuma música encontrada aqui.' : `${n} música(s) encontrada(s).`;
}

async function refreshOrder() {
  if (!currentFolder) return;
  const names = await window.api.currentOrder(currentFolder);
  if (!names.length) {
    orderList.innerHTML = '<li><span class="muted">Sem músicas.</span></li>';
    return;
  }
  orderList.innerHTML = names.map((n) => `<li><span>${escapeHtml(n)}</span></li>`).join('');
}

pickBtn.addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) setFolder(folder);
});

refreshOrderBtn.addEventListener('click', refreshOrder);

window.api.onProgress((p) => {
  const verbo = p.phase === 'backup' ? 'A preparar' : 'A gravar no cartão';
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressText.textContent = `${verbo}… ${p.done}/${p.total} (${pct}%)`;
});

shuffleBtn.addEventListener('click', async () => {
  if (!currentFolder) return;
  const buttons = [shuffleBtn, lastOrderBtn];
  buttons.forEach((b) => (b.disabled = true));
  shuffleBtn.innerHTML = '<span class="spinner"></span>A começar…';
  resultEl.className = 'result hidden';
  progressBar.style.width = '0%';
  progressText.textContent = 'A começar…';
  progressEl.classList.remove('hidden');

  const res = await window.api.shuffle(currentFolder);

  shuffleBtn.innerHTML = shuffleBtnHTML;
  buttons.forEach((b) => (b.disabled = false));
  progressEl.classList.add('hidden');

  if (!res.ok) {
    showResult('err', 'Erro', res.error || 'Algo correu mal.');
    return;
  }
  if (res.count === 0) {
    showResult('err', 'Sem músicas', res.message);
    return;
  }

  // A ordem por que copiámos É a nova ordem física que a coluna vai tocar.
  const list = (res.order || [])
    .map((n) => `<li><span>${escapeHtml(n)}</span></li>`)
    .join('');
  const extra = list
    ? `<p class="hint muted" style="margin-top:10px">Nova ordem no cartão (é esta que a coluna vai tocar):</p><ul class="order-list">${list}</ul>`
    : '';
  showResult('ok', '✅ Baralhado no cartão!', res.message, extra);
  refreshOrder();
  refreshLastOrder();
});

function showResult(kind, title, message, extraHtml = '') {
  resultEl.className = `result ${kind}`;
  resultEl.innerHTML = `<h3>${escapeHtml(title)}</h3><div>${escapeHtml(message)}</div>${extraHtml}`;
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
