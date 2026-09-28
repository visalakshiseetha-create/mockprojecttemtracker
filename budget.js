/* ============================================================
   FILE: js/budget.js
   ROLE: Powers budget.html. Reads/writes BC.getBudgets()/
   setBudgets() — an object shaped { monthly, categories: {id:amt} }.
   For each ceiling it computes "spent so far this month" from
   BC.getExpenses() and draws a progress bar, colored green/amber/
   red depending on how close to (or over) the limit spending is.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const monthlyInput = document.getElementById('monthly-budget-input');
  const monthlyAmounts = document.getElementById('monthly-budget-amounts');
  const monthlyFill = document.getElementById('monthly-budget-fill');
  const categoryListEl = document.getElementById('category-budget-list');

  /* How much has been spent in the CURRENT calendar month, either
     overall or narrowed to one category. This is the number every
     progress bar on this page is measured against. */
  function spentThisMonth(categoryId) {
    return BC.getExpenses()
      .filter((e) => BC.isSameMonth(e.date) && (!categoryId || e.category === categoryId))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }

  /* Shared bar-fill logic: width capped at 100%, color escalates
     from accent -> amber (near limit) -> red (over limit). */
  function paintBar(fillEl, spent, limit) {
    if (limit == null || limit <= 0) {
      fillEl.style.width = '0%';
      fillEl.className = 'budget-bar__fill';
      return;
    }
    const pct = Math.min(100, (spent / limit) * 100);
    fillEl.style.width = `${pct}%`;
    fillEl.className = 'budget-bar__fill' + (spent > limit ? ' is-over' : pct >= 80 ? ' is-near' : '');
  }

  function render() {
    const budgets = BC.getBudgets();

    /* -------- Overall monthly section -------- */
    monthlyInput.value = budgets.monthly ?? '';
    const overallSpent = spentThisMonth();
    if (budgets.monthly != null) {
      const remaining = budgets.monthly - overallSpent;
      monthlyAmounts.textContent =
        `${BC.formatCurrency(overallSpent)} spent of ${BC.formatCurrency(budgets.monthly)} · ${BC.formatCurrency(Math.max(remaining, 0))} remaining`;
    } else {
      monthlyAmounts.textContent = `${BC.formatCurrency(overallSpent)} spent so far — no monthly limit set`;
    }
    paintBar(monthlyFill, overallSpent, budgets.monthly);

    /* -------- Per-category rows -------- */
    categoryListEl.innerHTML = BC.CATEGORIES.map((cat) => {
      const limit = budgets.categories[cat.id];
      const spent = spentThisMonth(cat.id);
      const amountsText = limit != null
        ? `${BC.formatCurrency(spent)} of ${BC.formatCurrency(limit)}`
        : `${BC.formatCurrency(spent)} spent — no limit set`;
      return `
        <div class="budget-row">
          <div class="budget-row__top">
            <div class="budget-row__name">${cat.icon} ${cat.name}</div>
            <input class="input" type="number" min="0" step="1" data-category-input="${cat.id}"
                   value="${limit != null ? limit : ''}" placeholder="No limit" style="width:120px;">
          </div>
          <div class="budget-row__amounts">${amountsText}</div>
          <div class="budget-bar"><div class="budget-bar__fill" id="fill-${cat.id}" style="width:0%;"></div></div>
        </div>
      `;
    }).join('');

    // Paint each category bar after the markup above exists in the DOM.
    BC.CATEGORIES.forEach((cat) => {
      paintBar(document.getElementById(`fill-${cat.id}`), spentThisMonth(cat.id), budgets.categories[cat.id]);
    });

    // Wire up save-on-change for every category limit input.
    categoryListEl.querySelectorAll('[data-category-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const b = BC.getBudgets();
        const val = input.value === '' ? undefined : parseFloat(input.value);
        if (val === undefined) delete b.categories[input.dataset.categoryInput];
        else b.categories[input.dataset.categoryInput] = val;
        BC.setBudgets(b);
        render();
      });
    });
  }

  monthlyInput.addEventListener('change', () => {
    const b = BC.getBudgets();
    b.monthly = monthlyInput.value === '' ? null : parseFloat(monthlyInput.value);
    BC.setBudgets(b);
    render();
  });

  render();
});
