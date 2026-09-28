/* ============================================================
   FILE: js/expenses.js
   ROLE: Powers expenses.html. Full expense tracker — add / edit
   / delete, category + date-range filtering, a running total,
   and two glass chart cards: a category donut (via chart.js)
   and a last-6-months bar chart.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('expense-full-list');
  const modal = document.getElementById('expense-editor-modal');
  const form = document.getElementById('expense-editor-form');
  const modalTitle = document.getElementById('expense-editor-title');
  const addBtn = document.getElementById('add-expense-btn');
  const deleteBtn = document.getElementById('expense-delete-btn');
  const runningTotalEl = document.getElementById('running-total-label');
  const donutCanvas = document.getElementById('category-donut');
  const donutLegend = document.getElementById('category-legend');
  const barCanvas = document.getElementById('monthly-bar');
  const categorySelect = document.getElementById('category-filter-select');
  const dateFrom = document.getElementById('date-from');
  const searchInput = document.getElementById('search-input');
  const dateTo = document.getElementById('date-to');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  let editingId = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* populate category select + form dropdown */
  function populateCategoryOptions() {
    categorySelect.innerHTML = `<option value="all">All categories</option>` +
      BC.CATEGORIES.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    const formSelect = form.elements.category;
    formSelect.innerHTML = BC.CATEGORIES.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }

  function getFiltered() {
    let expenses = BC.getExpenses().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const cat = categorySelect.value;
    if (cat && cat !== 'all') expenses = expenses.filter((e) => e.category === cat);
    if (dateFrom.value) expenses = expenses.filter((e) => e.date >= dateFrom.value);
    if (dateTo.value) expenses = expenses.filter((e) => e.date <= dateTo.value);
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
      expenses = expenses.filter((e) =>
        e.title.toLowerCase().includes(query) || (e.notes || '').toLowerCase().includes(query)
      );
    }
    return expenses;
  }

  function render() {
    const filtered = getFiltered();
    const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
    runningTotalEl.textContent = BC.formatCurrency(total);

    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="empty-state">No expenses match these filters.</div>`;
    } else {
      listEl.innerHTML = filtered.map((e) => {
        const cat = BC.categoryById(e.category);
        return `
          <div class="expense-item" data-id="${e.id}">
            <div class="expense-item__icon" style="background:${cat.color}33;">${cat.icon}</div>
            <div class="expense-item__body">
              <div class="expense-item__title">${escapeHtml(e.title)}</div>
              <div class="expense-item__meta">
                <span class="category-tag" style="background:${cat.color}33;color:${cat.color};">${cat.name}</span>
                <span>${BC.formatDate(e.date)}</span>
              </div>
            </div>
            <div class="expense-item__amount">${BC.formatCurrency(e.amount)}</div>
            <div class="expense-item__actions">
              <button class="icon-btn" data-edit="${e.id}" aria-label="Edit expense">✎</button>
              <button class="icon-btn" data-delete="${e.id}" aria-label="Delete expense">🗑</button>
            </div>
          </div>
        `;
      }).join('');
    }

    listEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit));
    });
    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this expense?')) return;
        const expenses = BC.getExpenses().filter((e) => e.id !== btn.dataset.delete);
        BC.setExpenses(expenses);
        render();
      });
    });

    renderCharts(filtered);
  }

  function renderCharts(filtered) {
    // Donut: breakdown by category within current filter
    const byCategory = {};
    filtered.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
    const slices = BC.CATEGORIES
      .map((c) => ({ label: c.name, value: byCategory[c.id] || 0, color: c.color }))
      .filter((s) => s.value > 0);

    BCChart.drawDonut(donutCanvas, slices);
    const total = slices.reduce((s, d) => s + d.value, 0) || 1;
    donutLegend.innerHTML = slices.length ? slices.map((s) => `
      <div class="chart-legend__item">
        <span class="chart-legend__swatch" style="background:${s.color};"></span>
        <span>${s.label}</span>
        <span class="chart-legend__amount">${BC.formatCurrency(s.value)} · ${Math.round((s.value / total) * 100)}%</span>
      </div>
    `).join('') : `<div class="empty-state">Nothing to chart yet.</div>`;

    // Bar: last 6 months, across ALL expenses (not filtered) for a stable trend view
    const all = BC.getExpenses();
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0 });
    }
    all.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((mm) => mm.key === key);
      if (m) m.value += Number(e.amount);
    });
    BCChart.drawBars(barCanvas, months);
  }

  function openEditor(id) {
    editingId = id || null;
    const expenses = BC.getExpenses();
    const expense = id ? expenses.find((e) => e.id === id) : null;

    modalTitle.textContent = expense ? 'Edit expense' : 'New expense';
    deleteBtn.style.display = expense ? 'inline-flex' : 'none';
    form.elements.title.value = expense ? expense.title : '';
    form.elements.amount.value = expense ? expense.amount : '';
    form.elements.category.value = expense ? expense.category : 'food';
    form.elements.date.value = expense ? expense.date : BC.todayISO();
    form.elements.notes.value = expense ? (expense.notes || '') : '';

    BC.openModal(modal);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    const amount = parseFloat(form.elements.amount.value);
    if (!title || Number.isNaN(amount)) return;
    const expenses = BC.getExpenses();

    if (editingId) {
      const item = expenses.find((x) => x.id === editingId);
      if (item) {
        item.title = title;
        item.amount = amount;
        item.category = form.elements.category.value;
        item.date = form.elements.date.value;
        item.notes = form.elements.notes.value.trim();
      }
    } else {
      expenses.push({
        id: BC.uid(),
        title,
        amount,
        category: form.elements.category.value,
        date: form.elements.date.value || BC.todayISO(),
        notes: form.elements.notes.value.trim(),
        createdAt: Date.now(),
      });
    }
    BC.setExpenses(expenses);
    BC.closeModal(modal);
    render();
  });

  deleteBtn.addEventListener('click', () => {
    if (!editingId || !confirm('Delete this expense?')) return;
    const expenses = BC.getExpenses().filter((e) => e.id !== editingId);
    BC.setExpenses(expenses);
    BC.closeModal(modal);
    render();
  });

  addBtn.addEventListener('click', () => openEditor());
  BC.bindModalDismiss(modal);

  [categorySelect, dateFrom, dateTo, searchInput].forEach((el) => el.addEventListener('input', render));
  clearFiltersBtn.addEventListener('click', () => {
    categorySelect.value = 'all';
    dateFrom.value = '';
    dateTo.value = '';
    searchInput.value = '';
    render();
  });

  window.addEventListener('resize', () => renderCharts(getFiltered()));

  populateCategoryOptions();
  render();
});
