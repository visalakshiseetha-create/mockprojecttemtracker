/* ============================================================
   FILE: js/profile.js
   ROLE: Powers profile.html. Reads/writes the single profile
   object via BC.getProfile()/setProfile(), and offers a "reset
   everything" control that wipes all four Beacon localStorage
   keys at once — the nuclear option for starting fresh.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('profile-name');
  const typeGrid = document.getElementById('profile-type-grid');
  const saveBtn = document.getElementById('save-profile-btn');
  const resetBtn = document.getElementById('reset-data-btn');
  const exportBtn2 = document.getElementById('export-data-btn-2');

  let selectedType = BC.getProfile().livingSituation;

  function renderTypeGrid() {
    typeGrid.innerHTML = BC.PROFILE_TYPES.map((t) => `
      <button type="button" class="profile-type-option ${t.id === selectedType ? 'is-selected' : ''}" data-type="${t.id}">
        ${t.name}
      </button>
    `).join('');

    typeGrid.querySelectorAll('[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.type;
        renderTypeGrid();
      });
    });
  }

  function loadProfile() {
    const profile = BC.getProfile();
    nameInput.value = profile.name || '';
    selectedType = profile.livingSituation;
    renderTypeGrid();
  }

  saveBtn.addEventListener('click', () => {
    BC.setProfile({ name: nameInput.value.trim(), livingSituation: selectedType });
    saveBtn.textContent = 'Saved ✓';
    setTimeout(() => { saveBtn.textContent = 'Save profile'; }, 1200);
  });

  // This page has its own export button (in the Data section) in
  // addition to the one in the sidebar — both call the same helper.
  if (exportBtn2) exportBtn2.addEventListener('click', () => BC.exportData());

  resetBtn.addEventListener('click', () => {
    if (!confirm('This deletes every task, expense, budget and profile setting stored in this browser. Continue?')) return;
    ['beacon_tasks', 'beacon_expenses', 'beacon_budgets', 'beacon_profile'].forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  loadProfile();
});
