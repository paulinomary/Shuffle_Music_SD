'use strict';

const folderEl = document.getElementById('folder');
const countEl = document.getElementById('count');
const pickBtn = document.getElementById('pick');
const shuffleBtn = document.getElementById('shuffle');
const restoreBtn = document.getElementById('restore');
const resultEl = document.getElementById('result');
const orderCard = document.getElementById('orderCard');
const orderList = document.getElementById('orderList');
const refreshOrderBtn = document.getElementById('refreshOrder');
const lastOrderBtn = document.getElementById('lastOrder');

let currentFolder = null;

function setFolder(folder) {
  currentFolder = folder;
  if (folder) {
    folderEl.textContent = folder;
    folderEl.classList.remove('muted');
    shuffleBtn.disabled = false;
    restoreBtn.disabled = false;
    orderCard.classList.remove('hidden');
    refreshCount();
    refreshOrder();
    refreshLastOrder();
  } else {
    folderEl.textContent = 'Nenhuma pasta escolhida';
    folderEl.classList.add('muted');
    shuffleBtn.disabled = true;
    restoreBtn.disabled = true;
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
  shuffleBtn.innerHTML = `<span class="spinner"></span>${verbo}… ${p.done}/${p.total}`;
});

shuffleBtn.addEventListener('click', async () => {
  if (!currentFolder) return;
  const buttons = [shuffleBtn, restoreBtn];
  const originalText = shuffleBtn.textContent;
  buttons.forEach((b) => (b.disabled = true));
  shuffleBtn.innerHTML = '<span class="spinner"></span>A começar…';
  resultEl.className = 'result hidden';

  const res = await window.api.shuffle(currentFolder);

  shuffleBtn.textContent = originalText;
  buttons.forEach((b) => (b.disabled = false));

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

restoreBtn.addEventListener('click', async () => {
  if (!currentFolder) return;
  const ok = confirm(
    'Isto remove os números de todas as músicas e deixa só os nomes originais.\n\nQueres continuar?'
  );
  if (!ok) return;
  await runAction(restoreBtn, 'A restaurar…', () => window.api.restore(currentFolder), '✅ Nomes originais restaurados!');
});

async function runAction(btn, busyText, action, okTitle) {
  const buttons = [shuffleBtn, restoreBtn];
  const originalText = btn.textContent;
  buttons.forEach((b) => (b.disabled = true));
  btn.innerHTML = `<span class="spinner"></span>${busyText}`;
  resultEl.className = 'result hidden';

  const res = await action();

  btn.textContent = originalText;
  buttons.forEach((b) => (b.disabled = false));

  if (!res.ok) {
    showResult('err', 'Erro', res.error || 'Algo correu mal.');
    return;
  }
  if (res.count === 0) {
    showResult('err', 'Sem músicas', res.message);
    return;
  }

  showResult('ok', okTitle, res.message);
  refreshCount();
  refreshOrder();
}

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
