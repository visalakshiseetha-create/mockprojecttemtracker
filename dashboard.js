/* ============================================================
   FILE: js/dashboard.js
   ROLE: Powers index.html only. Renders the top summary bar
   (pending tasks + this month's spend), the two quick-add
   modals, and the condensed Tasks/Expenses widget panels that
   mirror data owned by tasks.html / expenses.html.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    pendingCount: document.getElementById('stat-pending-tasks'),
    monthSpend: document.getElementById('stat-month-spend'),
    completedToday: document.getElementById('stat-completed'),
    budgetRemaining: document.getElementById('stat-budget-remaining'),
    taskList: document.getElementById('dash-task-list'),
    expenseList: document.getElementById('dash-expense-list'),
    quickAddTaskBtn: document.getElementById('quick-add-task-btn'),
    quickAddExpenseBtn: document.getElementById('quick-add-expense-btn'),
    taskModal: document.getElementById('task-modal'),
    expenseModal: document.getElementById('expense-modal'),
    taskForm: document.getElementById('quick-task-form'),
    expenseForm: document.getElementById('quick-expense-form'),
    expenseCategorySelect: document.querySelector('#quick-expense-form [name="category"]'),
  };

  /* The quick-add expense category list is built from BC.CATEGORIES
     instead of being hardcoded in the HTML, so Budget/Expenses/
     Dashboard can never drift out of sync with each other. */
  if (els.expenseCategorySelect) {
    els.expenseCategorySelect.innerHTML = BC.CATEGORIES
      .map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }

  function render() {
    const tasks = BC.getTasks();
    const expenses = BC.getExpenses();
    const budgets = BC.getBudgets();

    const pending = tasks.filter((t) => t.status === 'pending');
    const completeToday = tasks.filter((t) => t.status === 'complete').length;
    const monthTotal = expenses
      .filter((e) => BC.isSameMonth(e.date))
      .reduce((s, e) => s + Number(e.amount), 0);

    // Budget remaining = the overall monthly ceiling minus what's been
    // spent this month. If no ceiling has been set yet on the Budget
    // page, show "—" rather than a misleading $0.
    const remaining = budgets.monthly != null ? budgets.monthly - monthTotal : null;

    if (els.pendingCount) els.pendingCount.textContent = pending.length;
    if (els.completedToday) els.completedToday.textContent = completeToday;
    if (els.monthSpend) els.monthSpend.textContent = BC.formatCurrency(monthTotal);
    if (els.budgetRemaining) els.budgetRemaining.textContent = remaining == null ? '—' : BC.formatCurrency(remaining);

    renderTaskWidget(pending.slice(0, 5));
    renderExpenseWidget(expenses.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));
  }

  function renderTaskWidget(tasks) {
    if (!els.taskList) return;
    if (tasks.length === 0) {
      els.taskList.innerHTML = `<div class="empty-state">No pending tasks. Nice work! ✅</div>`;
      return;
    }
    els.taskList.innerHTML = tasks.map((t) => `
      <div class="task-item" data-id="${t.id}">
        <button class="task-item__checkbox" data-toggle="${t.id}" aria-label="Mark complete"></button>
        <div class="task-item__body">
          <div class="task-item__title">${escapeHtml(t.title)}</div>
          <div class="task-item__meta">
            <span class="chip chip--${t.priority}">${capitalize(t.priority)}</span>
            <span>${BC.formatDate(t.dueDate)}</span>
          </div>
        </div>
      </div>
    `).join('');

    els.taskList.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tasks = BC.getTasks();
        const task = tasks.find((t) => t.id === btn.dataset.toggle);
        if (task) {
          task.status = 'complete';
          BC.setTasks(tasks);
          render();
        }
      });
    });
  }

  function renderExpenseWidget(expenses) {
    if (!els.expenseList) return;
    if (expenses.length === 0) {
      els.expenseList.innerHTML = `<div class="empty-state">No expenses logged yet.</div>`;
      return;
    }
    els.expenseList.innerHTML = expenses.map((e) => {
      const cat = BC.categoryById(e.category);
      return `
        <div class="expense-item">
          <div class="expense-item__icon" style="background:${cat.color}33;">${cat.icon}</div>
          <div class="expense-item__body">
            <div class="expense-item__title">${escapeHtml(e.title)}</div>
            <div class="expense-item__meta">
              <span class="category-tag" style="background:${cat.color}33;color:${cat.color};">${cat.name}</span>
              <span>${BC.formatDate(e.date)}</span>
            </div>
          </div>
          <div class="expense-item__amount">${BC.formatCurrency(e.amount)}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* -------- Quick-add: task -------- */
  if (els.quickAddTaskBtn) {
    els.quickAddTaskBtn.addEventListener('click', () => BC.openModal(els.taskModal));
    BC.bindModalDismiss(els.taskModal);
  }
  if (els.taskForm) {
    els.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(els.taskForm);
      const tasks = BC.getTasks();
      tasks.push({
        id: BC.uid(),
        title: data.get('title').trim(),
        notes: '',
        dueDate: data.get('dueDate') || BC.todayISO(),
        priority: data.get('priority') || 'medium',
        category: data.get('category') || 'other',
        status: 'pending',
        order: tasks.length,
        createdAt: Date.now(),
      });
      BC.setTasks(tasks);
      els.taskForm.reset();
      BC.closeModal(els.taskModal);
      render();
    });
  }

  /* -------- Quick-add: expense -------- */
  if (els.quickAddExpenseBtn) {
    els.quickAddExpenseBtn.addEventListener('click', () => BC.openModal(els.expenseModal));
    BC.bindModalDismiss(els.expenseModal);
  }
  if (els.expenseForm) {
    els.expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(els.expenseForm);
      const expenses = BC.getExpenses();
      expenses.push({
        id: BC.uid(),
        title: data.get('title').trim(),
        amount: parseFloat(data.get('amount')) || 0,
        category: data.get('category') || 'other',
        date: data.get('date') || BC.todayISO(),
        createdAt: Date.now(),
      });
      BC.setExpenses(expenses);
      els.expenseForm.reset();
      BC.closeModal(els.expenseModal);
      render();
    });
  }

  render();
});
