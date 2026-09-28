/* ============================================================
   FILE: js/calendar.js
   ROLE: Powers calendar.html. Builds a plain month-grid (no
   library) from scratch using Date math, marks any day that has
   a task due with a dot, and lists that day's tasks in the side
   panel when clicked. Also lets you toggle a task complete right
   from the calendar.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const monthLabel = document.getElementById('cal-month-label');
  const weekdaysEl = document.getElementById('cal-weekdays');
  const gridEl = document.getElementById('cal-grid');
  const dayTasksEl = document.getElementById('cal-day-tasks');
  const selectedLabel = document.getElementById('cal-selected-label');
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdaysEl.innerHTML = WEEKDAYS.map((d) => `<div class="calendar-weekday">${d}</div>`).join('');

  let viewDate = new Date(); // any date within the month currently shown
  let selectedISO = BC.todayISO();

  function isoOf(year, month, day) {
    // Build the YYYY-MM-DD string by hand (not toISOString, which
    // shifts by timezone) so it matches task.dueDate exactly.
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function tasksDueOn(iso) {
    return BC.getTasks().filter((t) => t.dueDate === iso);
  }

  function render() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthLabel.textContent = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayISO = BC.todayISO();

    let cells = '';
    for (let i = 0; i < firstWeekday; i++) cells += `<div class="calendar-day is-empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = isoOf(year, month, day);
      const due = tasksDueOn(iso);
      const classes = ['calendar-day'];
      if (iso === todayISO) classes.push('is-today');
      if (iso === selectedISO) classes.push('is-selected');
      cells += `
        <div class="${classes.join(' ')}" data-date="${iso}">
          <span class="calendar-day__num">${day}</span>
          ${due.length ? `<div class="calendar-day__dots">${due.slice(0, 4).map(() => '<span class="calendar-day__dot"></span>').join('')}</div>` : ''}
        </div>`;
    }
    gridEl.innerHTML = cells;

    gridEl.querySelectorAll('.calendar-day[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedISO = cell.dataset.date;
        render();
      });
    });

    renderDayPanel();
  }

  function renderDayPanel() {
    selectedLabel.textContent = BC.formatDate(selectedISO);
    const tasks = tasksDueOn(selectedISO);

    if (tasks.length === 0) {
      dayTasksEl.innerHTML = `<div class="empty-state">No tasks due this day.</div>`;
      return;
    }

    dayTasksEl.innerHTML = tasks.map((t) => `
      <div class="task-item ${t.status === 'complete' ? 'is-complete' : ''}">
        <button class="task-item__checkbox ${t.status === 'complete' ? 'is-checked' : ''}" data-toggle="${t.id}" aria-label="Toggle complete"></button>
        <div class="task-item__body">
          <div class="task-item__title">${escapeHtml(t.title)}</div>
          <div class="task-item__meta"><span class="chip chip--${t.priority}">${t.priority}</span></div>
        </div>
      </div>
    `).join('');

    dayTasksEl.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tasks = BC.getTasks();
        const t = tasks.find((x) => x.id === btn.dataset.toggle);
        if (t) {
          t.status = t.status === 'complete' ? 'pending' : 'complete';
          BC.setTasks(tasks);
          render();
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  prevBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    render();
  });
  nextBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    render();
  });

  render();
});
