/* ============================================================
   КОНФИГУРАЦИЯ
   ============================================================ */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxIvXMqWGyCy-S3_9Db5FXxWiTuLNLjCEELCU0Fq2nGd3rfZBCQP3ztIVRuFGOeUr25tw/exec', // ОБЯЗАТЕЛЬНО ЗАМЕНИТЬ
  API_TOKEN: '3f8c1d94b2e7f6a0c5d8e1b4f7a2c9d3e6b8f1a4c7d0e3b6f9a2c5d8e1b4f7'
};

/* ============================================================
   КАТЕГОРИИ
   ============================================================ */
const categories = {
  expense: [
    { label: '🛒 Продукты',    main: true  },
    { label: '🍔 Фастфуд',     main: true  },
    { label: '🍺 Алкоголь',    main: true  },
    { label: '🚕 Такси',       main: true  },
    { label: '🚇 Транспорт',   main: true  },
    { label: '📱 Связь',       main: true  },
    { label: '💊 Здоровье',    main: true  },
    { label: '💇 Красота',     main: true  },
    { label: '👕 Одежда',      main: false },
    { label: '🎮 Развлечения', main: false },
    { label: '🏠 Дом',         main: false },
    { label: '💐 Цветы',       main: false },
    { label: '✈️ Путешествия', main: false },
    { label: '🔄 Переводы',    main: false },
    { label: '💸 Комиссии',    main: false },
    { label: '📦 Прочее',      main: false }
  ],
  income: [
    { label: '🎁 Кэшбэк',      main: true },
    { label: '🏦 % по вкладу', main: true },
    { label: '📈 Инвестиции',  main: true },
    { label: '🤝 Подарки',     main: true },
    { label: '💵 Зарплата',    main: true },
    { label: '💰 Прочее',      main: true },
    { label: '💸 Аванс',       main: true }
  ]
};

let currentType = 'expense';
let selectedCategory = null;
let isSubmitting = false;

const $ = (id) => document.getElementById(id);

/* ============================================================
   СТАТИСТИКА ИСПОЛЬЗОВАНИЯ
   ============================================================ */
const STATS_KEY = 'ops-category-usage-v1';

function getUsageStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function incrementUsage(label) {
  try {
    const stats = getUsageStats();
    stats[label] = (stats[label] || 0) + 1;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function sortByUsage(list) {
  const stats = getUsageStats();
  return list
    .map((cat, idx) => ({ ...cat, _usage: stats[cat.label] || 0, _idx: idx }))
    .sort((a, b) => (b._usage - a._usage) || (a._idx - b._idx))
    .map(({ _usage, _idx, ...rest }) => rest);
}

/* ============================================================
   УТИЛИТЫ
   ============================================================ */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function setStatus(message, cls) {
  const el = $('status');
  el.textContent = message;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

// Форматирование ввода в стиле "1 234,56"
function formatAmountInput(value) {
  let clean = value.replace(/[^\d.,]/g, '');
  clean = clean.replace('.', ',');
  
  const parts = clean.split(',');
  let integerPart = parts[0];
  let decimalPart = parts.length > 1 ? ',' + parts[1].substring(0, 2) : '';
  
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  
  return integerPart + decimalPart;
}

function parseAmount(raw) {
  if (!raw) return NaN;
  const normalized = String(raw)
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  if (!normalized) return NaN;
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : NaN;
}

/* ============================================================
   ЛОГИКА ИНТЕРФЕЙСА
   ============================================================ */
function setType(type) {
  if (type !== 'expense' && type !== 'income') return;
  if (currentType === type) return;
  currentType = type;
  selectedCategory = null;

  $('btn-expense').classList.toggle('active', type === 'expense');
  $('btn-income').classList.toggle('active', type === 'income');
  $('btn-expense').setAttribute('aria-selected', type === 'expense' ? 'true' : 'false');
  $('btn-income').setAttribute('aria-selected', type === 'income' ? 'true' : 'false');

  renderCategories(type);
  setStatus('', '');
}

function renderCategories(type) {
  const grid = $('categories-grid');
  const list = categories[type] || [];
  const main  = list.filter(c => c.main);
  const extra = list.filter(c => !c.main);

  const mainSorted  = sortByUsage(main);
  const extraSorted = sortByUsage(extra);

  const html = [];

  mainSorted.forEach(cat => {
    const safe = escapeHtml(cat.label);
    html.push(`<button type="button" class="category-btn" data-category="${safe}">${safe}</button>`);
  });

  if (extraSorted.length > 0) {
    html.push(`<button type="button" class="category-btn more-btn">⋯ Ещё</button>`);
    html.push(`<div id="extra-categories" class="extra-grid hidden">`);
    extraSorted.forEach(cat => {
      const safe = escapeHtml(cat.label);
      html.push(`<button type="button" class="category-btn" data-category="${safe}">${safe}</button>`);
    });
    html.push(`</div>`);
  }

  grid.innerHTML = html.join('');
}

function toggleExtra() {
  const extra = $('extra-categories');
  if (extra) extra.classList.toggle('hidden');
}

function selectCategory(label, btn) {
  selectedCategory = label;
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
  if (btn) btn.classList.add('selected');
}

/* ============================================================
   ОТПРАВКА
   ============================================================ */
async function submitOperation() {
  if (isSubmitting) return;

  const amountInput = $('amount');
  const noteInput   = $('note');
  const submitBtn   = $('submit-btn');

  const amount = parseAmount(amountInput.value);
  const note = noteInput.value.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus('Введите сумму', 'error');
    amountInput.focus();
    return;
  }
  if (!selectedCategory) {
    setStatus('Выберите категорию', 'error');
    return;
  }

  const formData = new URLSearchParams();
  formData.append('token', CONFIG.API_TOKEN);
  formData.append('type', currentType);
  formData.append('amount', amount);
  formData.append('category', selectedCategory);
  formData.append('note', note);

  isSubmitting = true;
  submitBtn.disabled = true;
  setStatus('Отправка...', '');

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      redirect: 'follow'
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); }
    catch { result = { status: 'error', message: 'Ошибка сервера' }; }

    if (result.status === 'success') {
      incrementUsage(selectedCategory);
      setStatus('✅ Записано', 'success');
      amountInput.value = '';
      noteInput.value = '';
      selectedCategory = null;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));

      const extra = $('extra-categories');
      if (extra && !extra.classList.contains('hidden')) extra.classList.add('hidden');

      renderCategories(currentType);
    } else {
      setStatus('Ошибка: ' + (result.message || 'неизвестно'), 'error');
    }
  } catch (err) {
    setStatus('Ошибка сети', 'error');
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
  }
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-expense').addEventListener('click', () => setType('expense'));
  $('btn-income').addEventListener('click', () => setType('income'));
  $('submit-btn').addEventListener('click', submitOperation);

  // Обработчик суммы с сохранением позиции курсора
  $('amount').addEventListener('input', (e) => {
    const input = e.target;
    const oldLength = input.value.length;
    const cursorPosition = input.selectionStart;
    
    input.value = formatAmountInput(input.value);
    
    const newLength = input.value.length;
    const newPosition = cursorPosition + (newLength - oldLength);
    input.setSelectionRange(newPosition, newPosition);
    
    setStatus('', '');
  });

  $('note').addEventListener('input', () => setStatus('', ''));

  $('amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitOperation(); }
  });
  $('note').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitOperation(); }
  });

  $('categories-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (!btn) return;
    if (btn.classList.contains('more-btn')) { toggleExtra(); return; }
    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      selectedCategory = null;
      return;
    }
    selectCategory(btn.dataset.category, btn);
    setStatus('', '');
  });

  renderCategories(currentType);
});

/* ============================================================
   Service Worker
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}