/* ============================================================
   FILE: js/analytics.js
   ROLE: Powers analytics.html. Pulls everything from BC.getTasks()
   / getExpenses() — Analytics adds no new data of its own, it
   only summarizes what Tasks and Expenses already store. Reuses
   BCChart's donut/bar renderers from chart.js.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const monthSpendEl = document.getElementById('stat-month-spend');
  const monthDeltaEl = document.getElementById('stat-month-delta');
  const completionEl = document.getElementById('stat-completion');
  const completionSubEl = document.getElementById('stat-completion-sub');
  const overdueEl = document.getElementById('stat-overdue');
  const donutCanvas = document.getElementById('category-donut');
  const donutLegend = document.getElementById('category-legend');
  const barCanvas = document.getElementById('monthly-bar');

  function render() {
    const tasks = BC.getTasks();
    const expenses = BC.getExpenses();

    /* -------- This month vs last month spend (period comparison) -------- */
    const now = new Date();
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthTotal = expenses.filter((e) => BC.isSameMonth(e.date, now)).reduce((s, e) => s + Number(e.amount), 0);
    const lastMonthTotal = expenses.filter((e) => BC.isSameMonth(e.date, lastMonthRef)).reduce((s, e) => s + Number(e.amount), 0);

    monthSpendEl.textContent = BC.formatCurrency(thisMonthTotal);
    if (lastMonthTotal > 0) {
      const deltaPct = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      const arrow = deltaPct >= 0 ? '▲' : '▼';
      monthDeltaEl.textContent = `${arrow} ${Math.abs(deltaPct).toFixed(0)}% vs last month`;
      monthDeltaEl.className = 'stat-tile__delta ' + (deltaPct >= 0 ? 'is-up' : 'is-down');
    } else {
      monthDeltaEl.textContent = 'No spend last month to compare';
    }

    /* -------- Task completion -------- */
    const completed = tasks.filter((t) => t.status === 'complete').length;
    const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    completionEl.textContent = `${pct}%`;
    completionSubEl.textContent = `${completed} of ${tasks.length} tasks done`;

    /* -------- Overdue tasks -------- */
    const todayISO = BC.todayISO();
    const overdue = tasks.filter((t) => t.status === 'pending' && t.dueDate && t.dueDate < todayISO);
    overdueEl.textContent = overdue.length;

    renderCharts(expenses);
  }

  function renderCharts(expenses) {
    const byCategory = {};
    expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount); });
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

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), value: 0 });
    }
    expenses.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((mm) => mm.key === key);
      if (m) m.value += Number(e.amount);
    });
    BCChart.drawBars(barCanvas, months);
  }

  window.addEventListener('resize', () => renderCharts(BC.getExpenses()));
  render();
});
