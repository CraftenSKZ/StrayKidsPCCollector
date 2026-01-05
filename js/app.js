/***************************************************
 * Skz Photocard Tracker – app.js
 * Works on GitHub Pages
 ***************************************************/

/********************
 * Globals
 ********************/
let undoImportTimer = null;
let undoCountdownTimer = null;
let preImportOwnedSnapshot = null;
let undoSecondsLeft = 0;

/********************
 * Backup & Versioning
 ********************/
const BACKUP_VERSION = 1;
const META_KEY = 'albumTracker_meta';
const MEMBER_FILTER_KEY = 'albumTracker_memberFilters';

/********************
 * Export
 ********************/
function exportData() {
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    owned
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `album-tracker-backup-v${BACKUP_VERSION}.json`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const now = Date.now();
  localStorage.setItem(META_KEY, JSON.stringify({ lastBackup: now }));
  updateBackupStatus(true);
}

window.exportData = exportData;

/********************
 * Status helper
 ********************/
function showStatusMessage(text, color = '#aaa', autoFade = false) {
  const el = document.getElementById('backupStatus');
  if (!el) return;

  el.textContent = text;
  el.style.color = color;
  el.style.opacity = '1';
  el.style.transition = 'opacity 0.5s';

  if (autoFade) {
    setTimeout(() => {
      el.style.opacity = '0';
    }, 4000);
  }
}

/********************
 * Undo helpers
 ********************/
function cleanupUndoState() {
  preImportOwnedSnapshot = null;
  undoSecondsLeft = 0;

  if (undoImportTimer) {
    clearTimeout(undoImportTimer);
    undoImportTimer = null;
  }
  if (undoCountdownTimer) {
    clearInterval(undoCountdownTimer);
    undoCountdownTimer = null;
  }

  const el = document.getElementById('backupStatus');
  if (el) {
    el.onclick = null;
    el.style.cursor = 'default';
  }
}

function undoImport() {
  if (!preImportOwnedSnapshot) {
    showStatusMessage('Nothing to undo', '#FFB347', true);
    return;
  }

  owned = preImportOwnedSnapshot;
  save();
  render();

  cleanupUndoState();

  showStatusMessage('↩ Import undone', '#7CFF9B', true);
}

window.undoImport = undoImport;

function renderUndoStatus() {
  const el = document.getElementById('backupStatus');
  if (!el) return;

  el.innerHTML = `
    ✔ Import successful
    <button class="undo-btn" type="button">
      Undo (${undoSecondsLeft}s)
    </button>
  `;

  const btn = el.querySelector('button');
  if (btn) btn.onclick = undoImport;

  el.style.color = '#7CFF9B';
  el.style.opacity = '1';
}

/********************
 * Import
 ********************/
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);

      if (
        json.version !== BACKUP_VERSION ||
        typeof json.owned !== 'object'
      ) {
        throw new Error('Invalid backup file');
      }

      preImportOwnedSnapshot = JSON.parse(JSON.stringify(owned));

      owned = json.owned;
      save();
      render();

      cleanupUndoState();

      undoSecondsLeft = 30;
      renderUndoStatus();

      const el = document.getElementById('backupStatus');
      el.style.cursor = 'pointer';
      el.onclick = undoImport;

      undoCountdownTimer = setInterval(() => {
        undoSecondsLeft--;
        if (undoSecondsLeft <= 0) {
          cleanupUndoState();
          updateBackupStatus();
        } else {
          renderUndoStatus();
        }
      }, 1000);

      undoImportTimer = setTimeout(() => {
        cleanupUndoState();
        updateBackupStatus();
      }, 30000);

    } catch {
      showStatusMessage(
        '✖ Import failed: invalid backup file',
        '#FFB347',
        false
      );
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

window.importData = importData;

/********************
 * Backup status
 ********************/
function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function updateBackupStatus(justBackedUp = false) {
  const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
  const el = document.getElementById('backupStatus');
  if (!el) return;

  el.style.opacity = '1';

  if (!meta.lastBackup) {
    el.textContent = 'No backup yet';
    el.style.color = '#aaa';
    return;
  }

  const ageDays = (Date.now() - meta.lastBackup) / (1000 * 60 * 60 * 24);
  const formatted = formatDateTime(meta.lastBackup);

  if (justBackedUp) {
    el.textContent = `✔ Backup complete: ${formatted}`;
    el.style.color = '#7CFF9B';
    setTimeout(() => (el.style.opacity = '0'), 4000);
    return;
  }

  if (ageDays >= 2) {
    el.textContent = `⚠ Backup recommended (last: ${formatted})`;
    el.style.color = '#FFB347';
  } else {
    el.textContent = `Last backup: ${formatted}`;
    el.style.color = '#aaa';
  }
}

/********************
 * DOM references
 ********************/
const searchInput = document.getElementById('search');
const ownedFilterSelect = document.getElementById('ownedFilter');
const list = document.getElementById('list');
const cardList = document.getElementById('cardList');
const memberFilters = document.getElementById('memberFilters');
const progress = document.getElementById('progress');
const statsEl = document.getElementById('stats');

/********************
 * Catalog loading
 ********************/
const CATEGORIES = [
  'korean_albums',
  'japanese_albums',
  'korean_pob',
  'japanese_pob'
];

const CATALOG = {};
let category = 'korean_albums';

async function loadCatalog() {
  const seenIds = new Set();

  for (const cat of CATEGORIES) {
    const res = await fetch(`data/${cat}.json`);
    const items = await res.json();

    items.forEach(item => {
      if (!item.id || !item.name) throw new Error(`Invalid item in ${cat}`);
      if (!item.album && item.source) item.album = item.source;
      if (seenIds.has(item.id)) throw new Error(`Duplicate ID ${item.id}`);
      seenIds.add(item.id);
    });

    CATALOG[cat] = items;
  }
}

/********************
 * User-owned state
 ********************/
let owned = JSON.parse(localStorage.getItem('albumTracker_owned') || '{}');
let persistedMemberFilters = JSON.parse(
  localStorage.getItem(MEMBER_FILTER_KEY) || '{}'
);

function save() {
  localStorage.setItem('albumTracker_owned', JSON.stringify(owned));
}

/********************
 * App Logic
 ********************/
function setCategory(c) {
  category = c;
  document.querySelectorAll('.tabs button').forEach(b =>
    b.classList.toggle('active', b.onclick.toString().includes(c))
  );
  render();
}

window.setCategory = setCategory;

function toggle(id) {
  owned[id] = !owned[id];
  save();
  render();
}

function render() {
  list.innerHTML = '';
  cardList.innerHTML = '';

  let items = CATALOG[category] || [];

  const q = searchInput.value.toLowerCase();
  if (q) {
    items = items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        (i.album || '').toLowerCase().includes(q)
    );
  }

  const f = ownedFilterSelect.value;
  if (f === 'owned') items = items.filter(i => owned[i.id]);
  if (f === 'unowned') items = items.filter(i => !owned[i.id]);

  const members = [...new Set(items.map(i => i.member).filter(Boolean))];
  memberFilters.innerHTML = '';

  if (!persistedMemberFilters[category]) {
    persistedMemberFilters[category] = [...members];
  }

  members.forEach(m => {
    const checked = persistedMemberFilters[category].includes(m);
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}> ${m}`;

    const cb = label.querySelector('input');
    cb.onchange = () => {
      const set = new Set(persistedMemberFilters[category]);
      cb.checked ? set.add(m) : set.delete(m);
      persistedMemberFilters[category] = [...set];
      localStorage.setItem(
        MEMBER_FILTER_KEY,
        JSON.stringify(persistedMemberFilters)
      );
      render();
    };

    memberFilters.appendChild(label);
  });

  items = items.filter(
    i =>
      !i.member ||
      persistedMemberFilters[category].includes(i.member)
  );

  const ownedCount = items.filter(i => owned[i.id]).length;
  progress.textContent = `Completion: ${ownedCount}/${items.length}`;

  items.forEach(i => {
    const tr = document.createElement('tr');
    if (owned[i.id]) tr.classList.add('owned');

    tr.innerHTML = `
      <td><input type="checkbox" ${owned[i.id] ? 'checked' : ''}></td>
      <td>${i.name}</td>
      <td>${i.member || ''}</td>
      <td>${i.album || ''}</td>
      <td>${i.img ? `<img src="${i.img}">` : ''}</td>
    `;
    tr.querySelector('input').onchange = () => toggle(i.id);
    list.appendChild(tr);

    const card = document.createElement('div');
    card.className = 'card' + (owned[i.id] ? ' owned' : '');
    card.innerHTML = `
      <input type="checkbox" ${owned[i.id] ? 'checked' : ''}>
      ${i.img ? `<img src="${i.img}">` : ''}
      <div>
        <div class="title">${i.name}</div>
        <div class="meta">${i.member || ''} • ${i.album || ''}</div>
      </div>
    `;
    card.querySelector('input').onchange = () => toggle(i.id);
    cardList.appendChild(card);
  });
}

/********************
 * Boot
 ********************/
loadCatalog()
  .then(() => {
    render();
    updateBackupStatus();
  })
  .catch(err => {
    document.body.innerHTML = `<pre style="color:red">${err.message}</pre>`;
  });
