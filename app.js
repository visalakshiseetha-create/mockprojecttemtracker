/* ============================================================
   FILE: js/app.js
   ROLE: Shared foundation loaded on every page. Holds the
   localStorage data layer, formatting helpers, category/priority
   metadata, the top-nav active-link + mobile-menu behavior, the
   generic modal open/close helpers, and the mousemove 3D tilt
   effect (skipped on touch devices). Page-specific scripts
   (dashboard.js, tasks.js, expenses.js) build on top of this.
   ============================================================ */

const BC = (() => {
  /* -------------------------------------------------------------
     STORAGE KEYS
     Every localStorage key Beacon writes to. Keeping them as
     named constants (instead of typing the string every time)
     means a typo becomes a crash-on-load bug instead of a silent
     "my data disappeared" bug.
     ------------------------------------------------------------- */
  const TASKS_KEY = 'beacon_tasks';
  const EXPENSES_KEY = 'beacon_expenses';
  const BUDGETS_KEY = 'beacon_budgets';
  const PROFILE_KEY = 'beacon_profile';

  /* -------------------------------------------------------------
     EXPENSE CATEGORIES
     Per the project spec (section 5.4, Budget Module): Food/Mess,
     Transport, Books, Rent, Utilities, Entertainment, Subscriptions,
     Personal, Medical, Others. Every expense AND every budget line
     picks its category id from this same list, so the two modules
     always stay in sync automatically.
     ------------------------------------------------------------- */
  const CATEGORIES = [
    { id: 'food',          name: 'Food / Mess',    color: '#fbbf24', icon: '🍔' },
    { id: 'transport',     name: 'Transport',      color: '#5eead4', icon: '🚗' },
    { id: 'books',         name: 'Books',          color: '#818cf8', icon: '📚' },
    { id: 'rent',          name: 'Rent',           color: '#a78bfa', icon: '🏠' },
    { id: 'utilities',     name: 'Utilities',      color: '#60a5fa', icon: '💡' },
    { id: 'entertainment', name: 'Entertainment',  color: '#f97316', icon: '🎬' },
    { id: 'subscriptions', name: 'Subscriptions',  color: '#f472b6', icon: '📱' },
    { id: 'personal',      name: 'Personal',       color: '#ec4899', icon: '🧴' },
    { id: 'medical',       name: 'Medical',        color: '#34d399', icon: '💊' },
    { id: 'other',         name: 'Others',         color: '#94a3b8', icon: '✨' },
  ];

  /* Task priority chips (unchanged from before). */
  const PRIORITIES = [
    { id: 'low',    name: 'Low' },
    { id: 'medium', name: 'Medium' },
    { id: 'high',   name: 'High' },
  ];

  /* Task categories (spec section 5.2: a task has a category too,
     separate from expense categories — academic vs personal life). */
  const TASK_CATEGORIES = [
    { id: 'academic', name: 'Academic', icon: '🎓' },
    { id: 'personal',  name: 'Personal', icon: '🧑' },
    { id: 'other',     name: 'Other',    icon: '🗂️' },
  ];

  /* Student living-situation options for the Profile module
     (spec section 5.7 / 2.1 "User profile"). */
  const PROFILE_TYPES = [
    { id: 'day-scholar', name: 'Day Scholar' },
    { id: 'hostel',      name: 'Hostel Student' },
    { id: 'pg',          name: 'PG Student' },
  ];

  /* Generates a short unique-enough id for a new record: current
     timestamp in base36 + a few random base36 characters. Good
     enough for a client-only app with no server to coordinate ids. */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* -------- Generic localStorage read/write, JSON in and out -------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Beacon: failed to read', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Beacon: failed to write', key, e);
    }
  }

  /* Every page reads/writes through these functions rather than
     touching localStorage directly — so if the storage strategy
     ever changes (e.g. move to a real backend), only this file
     needs to change, not every page script. */
  function getTasks() { return readJSON(TASKS_KEY, []); }
  function setTasks(tasks) { writeJSON(TASKS_KEY, tasks); }
  function getExpenses() { return readJSON(EXPENSES_KEY, []); }
  function setExpenses(expenses) { writeJSON(EXPENSES_KEY, expenses); }

  /* Budgets are stored as { monthly: number|null, categories: { [categoryId]: number } }
     "monthly" is one overall spending ceiling; "categories" holds
     optional per-category ceilings (spec 5.4: "category-based or
     monthly budgets"). Either or both can be set. */
  function getBudgets() { return readJSON(BUDGETS_KEY, { monthly: null, categories: {} }); }
  function setBudgets(budgets) { writeJSON(BUDGETS_KEY, budgets); }

  /* Profile is a single object, not a list — there's only one
     "current student" using this browser's localStorage. */
  function getProfile() { return readJSON(PROFILE_KEY, { livingSituation: 'day-scholar', name: '' }); }
  function setProfile(profile) { writeJSON(PROFILE_KEY, profile); }

  function categoryById(id) {
    return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

  function taskCategoryById(id) {
    return TASK_CATEGORIES.find((c) => c.id === id) || TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'No date';
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function isSameMonth(dateStr, ref = new Date()) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  }

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  /* "2026-09" style key for grouping expenses by calendar month —
     used by the Budget module to total "spent so far this month". */
  function monthKey(dateStr = todayISO()) {
    return dateStr.slice(0, 7);
  }

  /* -------- Seed sample data on first visit so the UI never looks empty --------
     Examples are deliberately student-life flavored (assignments, mess fees,
     hostel rent) since Beacon's spec target user is a college student. */
  function seedIfEmpty() {
    if (localStorage.getItem(TASKS_KEY) === null) {
      const today = new Date();
      const inDays = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
      setTasks([
        { id: uid(), title: 'Submit database assignment', notes: '', dueDate: inDays(1), priority: 'high', category: 'academic', status: 'pending', order: 0, createdAt: Date.now() },
        { id: uid(), title: 'Pay hostel mess bill', notes: '', dueDate: inDays(3), priority: 'medium', category: 'personal', status: 'pending', order: 1, createdAt: Date.now() },
        { id: uid(), title: 'Prep for viva presentation', notes: '', dueDate: inDays(0), priority: 'high', category: 'academic', status: 'pending', order: 2, createdAt: Date.now() },
        { id: uid(), title: 'Renew library book', notes: '', dueDate: inDays(-1), priority: 'low', category: 'other', status: 'complete', order: 3, createdAt: Date.now() },
      ]);
    }
    if (localStorage.getItem(EXPENSES_KEY) === null) {
      const d = todayISO().slice(0, 8);
      setExpenses([
        { id: uid(), title: 'Mess bill', amount: 64.20, category: 'food', date: d + '02', notes: '', createdAt: Date.now() },
        { id: uid(), title: 'Bus pass top-up', amount: 25.00, category: 'transport', date: d + '05', notes: '', createdAt: Date.now() },
        { id: uid(), title: 'Hostel rent share', amount: 650.00, category: 'rent', date: d + '01', notes: '', createdAt: Date.now() },
        { id: uid(), title: 'Textbook', amount: 38.50, category: 'books', date: d + '06', notes: '', createdAt: Date.now() },
        { id: uid(), title: 'Movie night', amount: 32.00, category: 'entertainment', date: d + '08', notes: '', createdAt: Date.now() },
      ]);
    }
    /* Sensible starting budget so the Budget module isn't empty either:
       one overall monthly ceiling + a couple of category ceilings. */
    if (localStorage.getItem(BUDGETS_KEY) === null) {
      setBudgets({ monthly: 900, categories: { food: 150, rent: 650, entertainment: 60 } });
    }
    if (localStorage.getItem(PROFILE_KEY) === null) {
      setProfile({ livingSituation: 'hostel', name: '' });
    }
  }

  /* -------- Nav: active link highlight + mobile sidebar drawer -------- */
  function initNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar__link').forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('is-active', href === path);
    });

    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('is-open'));
      // Tapping a link on mobile should close the drawer behind it.
      sidebar.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => sidebar.classList.remove('is-open'));
      });
      // Tapping anywhere outside the open drawer closes it too.
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && e.target !== toggle) {
          sidebar.classList.remove('is-open');
        }
      });
    }

    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);
  }

  /* -------- Export tasks + expenses as a JSON file --------
     Feeds the Python/SQL analysis script (beacon_analysis.py):
     downloads a single JSON file with both tables + an export
     timestamp, ready to be loaded into SQLite. */
  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks: getTasks(),
      expenses: getExpenses(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beacon_export_${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------- Modal helpers -------- */
  function openModal(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.add('is-open');
    overlayEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const firstInput = overlayEl.querySelector('input, select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 300);
  }

  function closeModal(overlayEl) {
    if (!overlayEl) return;
    overlayEl.classList.remove('is-open');
    overlayEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function bindModalDismiss(overlayEl) {
    if (!overlayEl) return;
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) closeModal(overlayEl);
    });
    overlayEl.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(overlayEl));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlayEl.classList.contains('is-open')) {
        closeModal(overlayEl);
      }
    });
  }

  /* -------- 3D tilt on mouse move; skipped entirely on touch -------- */
  function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  function initTilt(root = document) {
    if (isTouchDevice()) return;
    const els = root.querySelectorAll('.tilt');
    els.forEach((el) => {
      const maxTilt = 3;
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateY = x * maxTilt * 2;
        const rotateX = -y * maxTilt * 2;
        el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
      });
    });
  }

  return {
    CATEGORIES, PRIORITIES, TASK_CATEGORIES, PROFILE_TYPES,
    uid, getTasks, setTasks, getExpenses, setExpenses, getBudgets, setBudgets, getProfile, setProfile,
    categoryById, taskCategoryById, formatCurrency, formatDate, isSameMonth, todayISO, monthKey,
    seedIfEmpty, initNav, openModal, closeModal, bindModalDismiss, initTilt, isTouchDevice, exportData,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  BC.seedIfEmpty();
  BC.initNav();
  BC.initTilt();
});
