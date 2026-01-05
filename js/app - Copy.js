/***************************************************
 * Skz Photocard Tracker – app.js
 * Works on GitHub Pages
 ***************************************************/

/************** 
 * scroll position saving
 ***************/
 function getScrollPos() {
  return {
    x: window.scrollX,
    y: window.scrollY
  };
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

      owned = json.owned;
      save();
      render();

      showStatusMessage(
        '✔ Import successful',
        '#7CFF9B',
        true
      );

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

// --- STATS ---
const ownedCount = items.filter(i => owned[i.id]).length;
progress.textContent = `Completion: ${ownedCount}/${items.length}`;

// --- GROUP BY ALBUM ---
const albums = {};
items.forEach(i => {
  const album = i.album || 'Unknown';
  if (!albums[album]) albums[album] = [];
  albums[album].push(i);
});

// Initialize collapse state per category
if (!albumCollapseState[category]) {
  albumCollapseState[category] = {};
}

// --- RENDER PER ALBUM ---
Object.entries(albums).forEach(([albumName, albumItems]) => {
  const albumOwned = albumItems.filter(i => owned[i.id]).length;
  const percent = albumItems.length
    ? Math.round((albumOwned / albumItems.length) * 100)
    : 0;

  const collapsed =
    albumCollapseState[category][albumName] ?? false;

  /* ===== TABLE HEADER ===== */
  const headerRow = document.createElement('tr');
  headerRow.className = 'album-header';
  headerRow.innerHTML = `
    <td colspan="5" style="cursor:pointer">
      ${collapsed ? '▶' : '▼'} <b>${albumName}</b>
      — ${albumOwned} / ${albumItems.length} (${percent}%)
    </td>
  `;

  headerRow.onclick = () => {
    albumCollapseState[category][albumName] = !collapsed;
    localStorage.setItem(
      ALBUM_COLLAPSE_KEY,
      JSON.stringify(albumCollapseState)
    );
    render();
  };

  list.appendChild(headerRow);

  /* ===== MOBILE HEADER ===== */
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'album-header-card';
  mobileHeader.innerHTML = `
    ${collapsed ? '▶' : '▼'} <b>${albumName}</b>
    — ${albumOwned}/${albumItems.length} (${percent}%)
  `;
  mobileHeader.onclick = headerRow.onclick;
  cardList.appendChild(mobileHeader);

  if (collapsed) return;

  /* ===== ITEMS ===== */
  albumItems.forEach(i => {
    // ---- TABLE ROW ----
    const tr = document.createElement('tr');
    if (owned[i.id]) tr.classList.add('owned');

    tr.innerHTML = `
      <td><input type="checkbox" ${owned[i.id] ? 'checked' : ''}></td>
      <td>${i.name}</td>
      <td>${i.member || ''}</td>
      <td>${i.album || ''}</td>
      <td>${i.img ? `<img src="${i.img}">` : ''}</td>
    `;
        const checkbox = tr.querySelector('input');

        checkbox.onpointerdown = e => {
          e.preventDefault(); // stops focus BEFORE it happens
        };

        checkbox.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          checkbox.blur(); // explicitly remove focus
          toggle(i.id);
        };
    list.appendChild(tr);

    // ---- MOBILE CARD ----
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
        const cardCheckbox = card.querySelector('input');

        cardCheckbox.onpointerdown = e => {
          e.preventDefault();
        };

        cardCheckbox.onclick = e => {
          e.preventDefault();
          e.stopPropagation();
          cardCheckbox.blur();
          toggle(i.id);
        };

    cardList.appendChild(card);
  });
});

}

function toggleAllAlbums() {
  const items = CATALOG[category] || [];
  if (!items.length) return;

  // Build a complete album list
  const albums = [...new Set(items.map(i => i.album || 'Unknown'))];

  // Ensure state exists for this category
  if (!albumCollapseState[category]) {
    albumCollapseState[category] = {};
  }

  // Ensure every album has a state
  albums.forEach(album => {
    if (albumCollapseState[category][album] === undefined) {
      albumCollapseState[category][album] = false;
    }
  });

  const states = albums.map(a => albumCollapseState[category][a]);

  // If ALL expanded → collapse all, else expand all
  const allExpanded = states.every(v => v === false);

  albums.forEach(album => {
    albumCollapseState[category][album] = allExpanded;
  });

  localStorage.setItem(
    ALBUM_COLLAPSE_KEY,
    JSON.stringify(albumCollapseState)
  );

  render();
  // --- Update Expand / Collapse All button label ---
const toggleBtn = document.getElementById('toggleAlbumsBtn');
if (toggleBtn) {
  const items = CATALOG[category] || [];
  const albums = [...new Set(items.map(i => i.album || 'Unknown'))];

  if (!albums.length) {
    toggleBtn.textContent = 'Expand All';
  } else {
    const allExpanded = albums.every(
      album => albumCollapseState[category]?.[album] === false
    );

    toggleBtn.textContent = allExpanded
      ? 'Collapse All'
      : 'Expand All';
  }
}
}

window.toggleAllAlbums = toggleAllAlbums;


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
