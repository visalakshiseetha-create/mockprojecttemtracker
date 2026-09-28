/* ============================================================
   FILE: js/tasks.js
   ROLE: Powers tasks.html. Full task manager — add / edit /
   delete, complete toggling, priority chips, status + priority
   filtering, and drag-to-reorder within the list. All state is
   persisted through BC.getTasks()/setTasks() (localStorage).
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('task-full-list');
  const modal = document.getElementById('task-editor-modal');
  const form = document.getElementById('task-editor-form');
  const modalTitle = document.getElementById('task-editor-title');
  const addBtn = document.getElementById('add-task-btn');
  const emptyAddBtn = document.getElementById('empty-add-task-btn');
  const deleteBtn = document.getElementById('task-delete-btn');
  const statCount = document.getElementById('tasks-count-label');

  let statusFilter = 'all';
  let priorityFilter = 'all';
  let editingId = null;
  let dragId = null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function getFiltered() {
    let tasks = BC.getTasks().slice().sort((a, b) => a.order - b.order);
    if (statusFilter !== 'all') tasks = tasks.filter((t) => t.status === statusFilter);
    if (priorityFilter !== 'all') tasks = tasks.filter((t) => t.priority === priorityFilter);
    return tasks;
  }

  function render() {
    const tasks = getFiltered();
    const all = BC.getTasks();
    statCount.textContent = `${all.filter((t) => t.status === 'pending').length} pending · ${all.length} total`;

    if (tasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No tasks match this view.</p>
          <button class="btn btn-primary" id="empty-add-task-btn2" style="margin-top:12px;">+ Add a task</button>
        </div>`;
      document.getElementById('empty-add-task-btn2').addEventListener('click', () => openEditor());
      return;
    }

    listEl.innerHTML = tasks.map((t) => {
      const cat = BC.taskCategoryById(t.category || 'other');
      return `
      <div class="task-item ${t.status === 'complete' ? 'is-complete' : ''}" draggable="true" data-id="${t.id}">
        <span class="task-item__drag-handle" title="Drag to reorder">⠿</span>
        <button class="task-item__checkbox ${t.status === 'complete' ? 'is-checked' : ''}" data-toggle="${t.id}" aria-label="Toggle complete"></button>
        <div class="task-item__body">
          <div class="task-item__title">${escapeHtml(t.title)}</div>
          ${t.notes ? `<div class="task-item__meta">${escapeHtml(t.notes)}</div>` : ''}
          <div class="task-item__meta">
            <span class="chip chip--${t.priority}">${capitalize(t.priority)}</span>
            <span class="category-tag">${cat.icon} ${cat.name}</span>
            <span>📅 ${BC.formatDate(t.dueDate)}</span>
          </div>
        </div>
        <div class="task-item__actions">
          <button class="icon-btn" data-edit="${t.id}" aria-label="Edit task">✎</button>
          <button class="icon-btn" data-delete="${t.id}" aria-label="Delete task">🗑</button>
        </div>
      </div>
    `;
    }).join('');

    bindRowEvents();
  }

  function bindRowEvents() {
    listEl.querySelectorAll('[data-toggle]').forEach((btn) => {
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
    listEl.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit));
    });
    listEl.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this task?')) return;
        const tasks = BC.getTasks().filter((t) => t.id !== btn.dataset.delete);
        BC.setTasks(tasks);
        render();
      });
    });

    /* ---- Drag to reorder ---- */
    listEl.querySelectorAll('.task-item').forEach((row) => {
      row.addEventListener('dragstart', () => {
        dragId = row.dataset.id;
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        dragId = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = row.dataset.id;
        if (!dragId || dragId === targetId) return;
        const tasks = BC.getTasks().slice().sort((a, b) => a.order - b.order);
        const fromIdx = tasks.findIndex((t) => t.id === dragId);
        const toIdx = tasks.findIndex((t) => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = tasks.splice(fromIdx, 1);
        tasks.splice(toIdx, 0, moved);
        tasks.forEach((t, i) => { t.order = i; });
        BC.setTasks(tasks);
        render();
      });
    });
  }

  function openEditor(id) {
    editingId = id || null;
    const tasks = BC.getTasks();
    const task = id ? tasks.find((t) => t.id === id) : null;

    modalTitle.textContent = task ? 'Edit task' : 'New task';
    deleteBtn.style.display = task ? 'inline-flex' : 'none';
    form.elements.title.value = task ? task.title : '';
    form.elements.notes.value = task ? task.notes || '' : '';
    form.elements.dueDate.value = task ? task.dueDate : BC.todayISO();
    form.elements.priority.value = task ? task.priority : 'medium';
    form.elements.category.value = task ? (task.category || 'other') : 'academic';

    BC.openModal(modal);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tasks = BC.getTasks();
    const title = form.elements.title.value.trim();
    if (!title) return;

    if (editingId) {
      const t = tasks.find((x) => x.id === editingId);
      if (t) {
        t.title = title;
        t.notes = form.elements.notes.value.trim();
        t.dueDate = form.elements.dueDate.value;
        t.priority = form.elements.priority.value;
        t.category = form.elements.category.value;
      }
    } else {
      tasks.push({
        id: BC.uid(),
        title,
        notes: form.elements.notes.value.trim(),
        dueDate: form.elements.dueDate.value || BC.todayISO(),
        priority: form.elements.priority.value,
        category: form.elements.category.value,
        status: 'pending',
        order: tasks.length,
        createdAt: Date.now(),
      });
    }
    BC.setTasks(tasks);
    BC.closeModal(modal);
    render();
  });

  deleteBtn.addEventListener('click', () => {
    if (!editingId || !confirm('Delete this task?')) return;
    const tasks = BC.getTasks().filter((t) => t.id !== editingId);
    BC.setTasks(tasks);
    BC.closeModal(modal);
    render();
  });

  [addBtn, emptyAddBtn].forEach((btn) => btn && btn.addEventListener('click', () => openEditor()));
  BC.bindModalDismiss(modal);

  document.querySelectorAll('[data-status-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      statusFilter = btn.dataset.statusFilter;
      document.querySelectorAll('[data-status-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
      render();
    });
  });
  document.querySelectorAll('[data-priority-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      priorityFilter = btn.dataset.priorityFilter;
      document.querySelectorAll('[data-priority-filter]').forEach((b) => b.classList.toggle('is-active', b === btn));
      render();
    });
  });

  render();
});
