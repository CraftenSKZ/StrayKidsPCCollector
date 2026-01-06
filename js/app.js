/***************************************************
 * Skz Photocard Tracker – app.js
 * Works on GitHub Pages
 ***************************************************/
const BASE_PATH = '/StrayKidsPCCollector';
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

//********************
// Sorting handler
//********************/
function setSort(key) {
  if (sortState.key === key) {
    sortState.dir *= -1; // toggle direction
  } else {
    sortState.key = key;
    sortState.dir = 1;
  }
  render();
}

//*****************************************
// Update sort indicators in table headers
//****************************************/
function updateSortIndicators() {
  const map = {
    collected: 'th-collected',
    name: 'th-name',
    member: 'th-member'
  };

  // Reset all headers
  Object.values(map).forEach(id => {
    const th = document.getElementById(id);
    if (!th) return;
    th.textContent = th.textContent.replace(/[▲▼]/g, '').trim();
  });

  // Add arrow to active column
  if (!sortState.key) return;

  const th = document.getElementById(map[sortState.key]);
  if (!th) return;

  const arrow = sortState.dir === 1 ? ' ▲' : ' ▼';
  th.textContent += arrow;
}

window.setSort = setSort;



// Image source resolver with placeholder
function resolveImageSrc(item) {
  // Safety check
  if (!item?.id || typeof item.id !== 'string') {
    return `${BASE_PATH}/assets/images/ui/placeholder.webp`;
  }

  const albumFolder = item.id.split('-')[0];
  const filename = `${item.id}.webp`;

  return `${BASE_PATH}/assets/images/photocards/${category}/${albumFolder}/${filename}`;
}



// Sorting state
let sortState = {
  key: null,      // 'collected' | 'name' | 'member'
  dir: 1          // 1 = asc, -1 = desc
};


// Member filters
function buildMemberFilters(items) {
  memberFilters.innerHTML = '';

  // Collect unique members from the catalog
  const members = [...new Set(
    items
      .map(i => i.member)
      .filter(Boolean)
  )].sort();

  members.forEach(member => {
    const isChecked = persistedMemberFilters[member] !== false;

    const label = document.createElement('label');
    label.className = 'member-filter';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;

    checkbox.onchange = () => {
      persistedMemberFilters[member] = checkbox.checked;
      localStorage.setItem(
        MEMBER_FILTER_KEY,
        JSON.stringify(persistedMemberFilters)
      );
      render();
    };

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(member));

    memberFilters.appendChild(label);
  });
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
    const res = await fetch(`data/${cat}.json`);
    CATALOG[cat] = await res.json();
  }
}

/********************
 * User-owned state
 ********************/
let owned = JSON.parse(
  localStorage.getItem('albumTracker_owned') || '{}'
);
let persistedMemberFilters = JSON.parse(
  localStorage.getItem(MEMBER_FILTER_KEY) || '{}'
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

  // 🔴 CRITICAL: prevent focus before it happens
  cb.onpointerdown = e => {
    e.preventDefault();
  };

  cb.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    cb.blur();              // 🔴 remove focus immediately
    onToggle();
  };

  cb.onkeydown = e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      cb.blur();
      onToggle();
    }
  };

  return cb;
}


//********************
// Sorting helper
//********************/ 
function sortItems(items) {
  if (!sortState.key) return items;

  return [...items].sort((a, b) => {
    let va, vb;

    switch (sortState.key) {
      case 'collected':
        va = owned[a.id] ? 1 : 0;
        vb = owned[b.id] ? 1 : 0;
        break;
      case 'name':
        va = a.name || '';
        vb = b.name || '';
        break;
      case 'member':
        va = a.member || '';
        vb = b.member || '';
        break;
      default:
        return 0;
    }

    if (va < vb) return -1 * sortState.dir;
    if (va > vb) return 1 * sortState.dir;
    return 0;
  });
}

//********************
// View mode handler
//********************/
let viewMode = localStorage.getItem('viewMode') || 'list'; // 'list' | 'grid'

function setViewMode(mode) {
  viewMode = mode;
  localStorage.setItem('viewMode', mode);
  render();
}

window.setViewMode = setViewMode;

/********************
 * App Logic
 ********************/
function setCategory(c) {
  category = c;

  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.category === c
    );
  });

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

function updateToggleAlbumsButton() {
  const btn = document.getElementById('toggleAlbumsBtn');
  if (!btn) return;

  const items = CATALOG[category] || [];
  const albums = [...new Set(items.map(i => i.album || 'Unknown'))];

  if (!albums.length) {
    btn.textContent = 'Expand All';
    return;
  }

  const allExpanded = albums.every(
    album => albumCollapseState[category]?.[album] === false
  );

  btn.textContent = allExpanded ? 'Collapse All' : 'Expand All';
}

function toggleAllAlbums() {
  const items = CATALOG[category] || [];
  if (!items.length) return;

  const albums = [...new Set(items.map(i => i.album || 'Unknown'))];

  if (!albumCollapseState[category]) {
    albumCollapseState[category] = {};
  }

  albums.forEach(album => {
    if (albumCollapseState[category][album] === undefined) {
      albumCollapseState[category][album] = false;
    }
  });

  const allExpanded = albums.every(
    album => albumCollapseState[category][album] === false
  );

  albums.forEach(album => {
    albumCollapseState[category][album] = allExpanded;
  });

  localStorage.setItem(
    ALBUM_COLLAPSE_KEY,
    JSON.stringify(albumCollapseState)
  );

  render();
  updateToggleAlbumsButton();
}

window.toggleAllAlbums = toggleAllAlbums;

function render() {
  list.innerHTML = '';
  cardList.innerHTML = '';

 let items = CATALOG[category] || [];

// Handle view mode 
const gridView = document.getElementById('gridView');

// ✅ APPLY CLASS FIRST
document.body.classList.toggle('grid-active', viewMode === 'grid');

list.style.display = viewMode === 'list' ? '' : 'none';
cardList.style.display = viewMode === 'list' ? '' : 'none';
gridView.style.display = viewMode === 'grid' ? '' : 'none';



document.body.classList.toggle('grid-active', viewMode === 'grid');

  const q = searchInput.value.toLowerCase();
  if (q) {
    items = items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        (i.album || '').toLowerCase().includes(q)
    );
  }
updateSortIndicators();
  const f = ownedFilterSelect.value;
  if (f === 'owned') items = items.filter(i => owned[i.id]);
  if (f === 'unowned') items = items.filter(i => !owned[i.id]);

// Member filter
items = items.filter(i => {
  if (!i.member) return true;
  return persistedMemberFilters[i.member] !== false;
});

// Sort items
  items = sortItems(items);

  buildMemberFilters(CATALOG[category] || []);

  const ownedCount = items.filter(i => owned[i.id]).length;
  const totalPercent = items.length
  ? Math.round((ownedCount / items.length) * 100)
  : 0;

  progress.textContent =
  `Completion: ${ownedCount}/${items.length} (${totalPercent}%)`;

  const albums = {};
  items.forEach(i => {
    const album = i.album || 'Unknown';
    if (!albums[album]) albums[album] = [];
    albums[album].push(i);
  });

  if (!albumCollapseState[category]) {
    albumCollapseState[category] = {};
  }

Object.entries(albums).forEach(([album, albumItems]) => {
  const albumOwned = albumItems.filter(i => owned[i.id]).length;
  const percent = albumItems.length
    ? Math.round((albumOwned / albumItems.length) * 100)
    : 0;

  const collapsed =
    albumCollapseState[category]?.[album] ?? false;

  const triangle = collapsed ? '▶' : '▼';

  /* ===== TABLE HEADER ===== */
  const header = document.createElement('tr');
  header.className = 'album-header';
  header.innerHTML = `
    <td colspan="4" style="cursor:pointer">
      <span class="album-toggle-icon">${triangle}</span>
      <b>${album}</b>
      — ${albumOwned}/${albumItems.length} (${percent}%)
    </td>
  `;

  header.onclick = () => {
    albumCollapseState[category][album] = !collapsed;
    localStorage.setItem(
      ALBUM_COLLAPSE_KEY,
      JSON.stringify(albumCollapseState)
    );
    render();
  };

  list.appendChild(header);

  /* ===== MOBILE HEADER ===== */
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'album-header-card';
  mobileHeader.innerHTML = `
    <span class="album-toggle-icon">${triangle}</span>
    <b>${album}</b>
    — ${albumOwned}/${albumItems.length} (${percent}%)
  `;
  mobileHeader.onclick = header.onclick;
  cardList.appendChild(mobileHeader);

  if (collapsed) return;

  /* ===== ITEMS ===== */
    albumItems.forEach(i => {
      const tr = document.createElement('tr');
      if (owned[i.id]) tr.classList.add('owned');

      const tdCb = document.createElement('td');
      tdCb.appendChild(
        createCheckbox(!!owned[i.id], () => toggle(i.id))
      );
      tr.appendChild(tdCb);

      const tdName = document.createElement('td');
      tdName.textContent = i.name;
      tr.appendChild(tdName);

      const tdMember = document.createElement('td');
      tdMember.textContent = i.member || '';
      tr.appendChild(tdMember);



// ✅ CREATE IMAGE TD
const tdImg = document.createElement('td');

const tableImg = document.createElement('img');
tableImg.src = resolveImageSrc(i);
tableImg.loading = 'lazy';
tableImg.decoding = 'async';
tableImg.width = 50;
tableImg.height = 80;

tableImg.onerror = () => {
  tableImg.onerror = null;
  tableImg.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
};

tdImg.appendChild(tableImg);
tr.appendChild(tdImg);

list.appendChild(tr);


      const card = document.createElement('div');
      card.className = 'card' + (owned[i.id] ? ' owned' : '');
      card.appendChild(
        createCheckbox(!!owned[i.id], () => toggle(i.id))
      );


const cardImg = document.createElement('img');
cardImg.src = resolveImageSrc(i);
cardImg.loading = 'lazy';
cardImg.decoding = 'async';

cardImg.onerror = () => {
  cardImg.onerror = null;
  cardImg.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
};

card.appendChild(cardImg);
      const textWrap = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = i.name;

const meta = document.createElement('div');
meta.className = 'meta';
meta.textContent = i.member || '';

      textWrap.appendChild(title);
      textWrap.appendChild(meta);
      card.appendChild(textWrap);

      cardList.appendChild(card);
  });
});

//********************
// Grid view renderer
//********************/ 
function renderGridView(items) {
  const gridView = document.getElementById('gridView');
  gridView.innerHTML = '';

  const albums = {};
  items.forEach(i => {
    const album = i.album || 'Unknown';
    if (!albums[album]) albums[album] = [];
    albums[album].push(i);
  });

Object.entries(albums).forEach(([album, albumItems]) => {
  if (!albumCollapseState[category]) {
    albumCollapseState[category] = {};
  }
  const collapsed = albumCollapseState[category][album] ?? false;

    // Album title
const title = document.createElement('h3');
title.className = 'grid-album-title';
title.innerHTML = `
  <span class="album-toggle-icon">${collapsed ? '▶' : '▼'}</span>
  ${album}
`;

title.onclick = () => {
  albumCollapseState[category][album] = !collapsed;
  localStorage.setItem(
    ALBUM_COLLAPSE_KEY,
    JSON.stringify(albumCollapseState)
  );
  render();
};

gridView.appendChild(title);

if (collapsed) return;
    // Album grid
    const grid = document.createElement('div');
    grid.className = 'album-grid';

    albumItems.forEach(i => {
      const card = document.createElement('div');
      card.className = 'grid-card' + (owned[i.id] ? ' owned' : '');

      // Image
      const img = document.createElement('img');
      img.src = resolveImageSrc(i);
      img.loading = 'lazy';
      img.onerror = () => {
        img.onerror = null;
        img.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
      };

      // Name
      const name = document.createElement('div');
      name.className = 'grid-name';
      name.textContent = i.name;

      // Checkmark
      const check = createCheckbox(!!owned[i.id], () => toggle(i.id));

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(check);

      grid.appendChild(card);
    });

    gridView.appendChild(grid);

    //Spacer
    const separator = document.createElement('div');
    separator.className = 'grid-album-separator';
    gridView.appendChild(separator);
  });
}

if (viewMode === 'grid') {
  renderGridView(items);
  return;
}

  updateToggleAlbumsButton();
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
    document.body.innerHTML = `<pre>${err.message}</pre>`;
  });