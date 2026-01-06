/***************************************************
 * Skz Photocard Tracker – app.js
 * Works on GitHub Pages
 ***************************************************/
const BASE_PATH = '/StrayKidsPCCollector';

/********************
 * Image helper (BULLETPROOF)
 ********************/
function resolveImageSrc(src) {
  return typeof src === 'string' && src.trim()
    ? src
    : `${BASE_PATH}/assets/images/ui/placeholder.webp`;
}

/************** 
 * scroll position saving
 ***************/
function getScrollPos() {
  return { x: window.scrollX, y: window.scrollY };
}

function restoreScrollPos(pos) {
  if (!pos) return;
  window.scrollTo(pos.x, pos.y);
}

/****************************
 * Constants Album Collapse
 ****************************/
const ALBUM_COLLAPSE_KEY = 'albumTracker_albumCollapse';
let albumCollapseState = JSON.parse(
  localStorage.getItem(ALBUM_COLLAPSE_KEY) || '{}'
);

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

  localStorage.setItem(
    META_KEY,
    JSON.stringify({ lastBackup: Date.now() })
  );

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

  if (autoFade) {
    setTimeout(() => (el.style.opacity = '0'), 4000);
  }
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
        throw new Error();
      }

      owned = json.owned;
      save();
      render();

      showStatusMessage('✔ Import successful', '#7CFF9B', true);
    } catch {
      showStatusMessage(
        '✖ Import failed: invalid backup file',
        '#FFB347'
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

  if (!meta.lastBackup) {
    el.textContent = 'No backup yet';
    return;
  }

  const formatted = formatDateTime(meta.lastBackup);
  const ageDays =
    (Date.now() - meta.lastBackup) / (1000 * 60 * 60 * 24);

  if (justBackedUp) {
    el.textContent = `✔ Backup complete: ${formatted}`;
    setTimeout(() => (el.style.opacity = '0'), 4000);
  } else if (ageDays >= 2) {
    el.textContent = `⚠ Backup recommended (last: ${formatted})`;
  } else {
    el.textContent = `Last backup: ${formatted}`;
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
  for (const cat of CATEGORIES) {
    const res = await fetch(`${BASE_PATH}/data/${cat}.json`);
    CATALOG[cat] = await res.json();
  }
}

/********************
 * User-owned state
 ********************/
let owned = JSON.parse(
  localStorage.getItem('albumTracker_owned') || '{}'
);

function save() {
  localStorage.setItem(
    'albumTracker_owned',
    JSON.stringify(owned)
  );
}

/********************
 * Custom checkbox helper
 ********************/
function createCheckbox(isChecked, onToggle) {
  const cb = document.createElement('div');
  cb.className = 'checkbox' + (isChecked ? ' checked' : '');

  cb.setAttribute('role', 'checkbox');
  cb.setAttribute('aria-checked', String(isChecked));
  cb.tabIndex = 0;

  cb.onclick = e => {
    e.stopPropagation();
    onToggle();
  };

  cb.onkeydown = e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };

  return cb;
}

/********************
 * App Logic
 ********************/
function setCategory(c) {
  category = c;
  render();
}

window.setCategory = setCategory;

function toggle(id) {
  const scrollPos = getScrollPos();
  owned[id] = !owned[id];
  save();
  render();
  restoreScrollPos(scrollPos);
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

  const albums = {};
  items.forEach(i => {
    const album = i.album || 'Unknown';
    if (!albums[album]) albums[album] = [];
    albums[album].push(i);
  });

  Object.entries(albums).forEach(([album, albumItems]) => {
    albumItems.forEach(i => {
      /* ===== TABLE ROW ===== */
      const tr = document.createElement('tr');

      const tdImg = document.createElement('td');
      const tableImg = document.createElement('img');
      tableImg.src = resolveImageSrc(i.img);
      tableImg.width = 50;
      tableImg.height = 80;
      tableImg.loading = 'lazy';
      tableImg.onerror = () => {
        tableImg.onerror = null;
        tableImg.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
      };
      tdImg.appendChild(tableImg);
      tr.appendChild(tdImg);
      list.appendChild(tr);

      /* ===== CARD ===== */
      const card = document.createElement('div');
      card.className = 'card';

      const cardImg = document.createElement('img');
      cardImg.src = resolveImageSrc(i.img);
      cardImg.loading = 'lazy';
      cardImg.onerror = () => {
        cardImg.onerror = null;
        cardImg.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
      };
      card.appendChild(cardImg);

      cardList.appendChild(card);
    });
  });
}

/********************
 * Boot
 ********************/
loadCatalog()
  .then(render)
  .catch(err => {
    document.body.innerHTML = `<pre>${err.message}</pre>`;
  });
