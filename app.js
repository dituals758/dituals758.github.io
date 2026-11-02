/* ============================================================
   КОНФИГУРАЦИЯ (замените значения на свои)
   ============================================================ */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbzULQY471v6pwk93kF3N1nDHv34eJjWKswnWZlD1ylg7bygMsgjsbADNzK37Cz8rY_XFA/exec',
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
    { label: '🎁 Кэшбэк',       main: true },
    { label: '🏦 % по вкладу',  main: true },
    { label: '📈 Инвестиции',   main: true },
    { label: '🤝 Подарки',      main: true },
    { label: '💵 Зарплата',     main: true },
    { label: '💰 Прочее',       main: true },
    { label: '💸 Аванс',        main: true }
  ]
};

let currentType = 'expense';
let selectedCategory = null;
let isSubmitting = false;

const $ = (id) => document.getElementById(id);

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

/* Разбор суммы: принимает "1 234,56", "1234.56", "1,5" */
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
  const main = list.filter(c => c.main);
  const extra = list.filter(c => !c.main);
  const html = [];

  main.forEach(cat => {
    const safe = escapeHtml(cat.label);
    html.push(`<button type="button" class="category-btn" data-category="${safe}">${safe}</button>`);
  });

  if (extra.length > 0) {
    html.push(`<button type="button" class="category-btn more-btn">⋯ Ещё</button>`);
    html.push(`<div id="extra-categories" class="extra-grid hidden">`);
    extra.forEach(cat => {
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
  if (
    !CONFIG.API_URL || !CONFIG.API_TOKEN ||
    CONFIG.API_URL.indexOf('ВАШ') !== -1 ||
    CONFIG.API_TOKEN.indexOf('ВАШ') !== -1
  ) {
    setStatus('Настройте CONFIG в app.js', 'error');
    return;
  }

  const payload = {
    token: CONFIG.API_TOKEN,
    type: currentType,
    amount: amount,
    category: selectedCategory,
    note: note
  };

  isSubmitting = true;
  submitBtn.disabled = true;
  setStatus('Отправка...', '');

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); }
    catch { result = { status: 'error', message: 'Некорректный ответ сервера' }; }

    if (result.status === 'success') {
      setStatus('✅ Записано', 'success');
      amountInput.value = '';
      noteInput.value = '';
      selectedCategory = null;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
      const extra = $('extra-categories');
      if (extra && !extra.classList.contains('hidden')) extra.classList.add('hidden');
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
   Инициализация
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  $('btn-expense').addEventListener('click', () => setType('expense'));
  $('btn-income').addEventListener('click', () => setType('income'));
  $('submit-btn').addEventListener('click', submitOperation);

  // Автоочистка статуса при новом вводе
  $('amount').addEventListener('input', () => setStatus('', ''));
  $('note').addEventListener('input', () => setStatus('', ''));

  // Enter в полях — отправка (для внешних клавиатур)
  $('amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitOperation(); }
  });
  $('note').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitOperation(); }
  });

  // Делегирование клика по категориям
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