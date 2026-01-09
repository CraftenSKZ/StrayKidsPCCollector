/***************************************************
 * Skz Photocard Tracker – app.js
 * Works on GitHub Pages
 ***************************************************/
// Import image utilities
import { BASE_PATH, resolveImageSrc, applyImageProps } from './utils/images.js';

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

// Member order for sorting
const MEMBER_ORDER = [
  'Bang Chan',
  'Lee Know',
  'Changbin',
  'Hyunjin',
  'HAN',
  'Felix',
  'Seungmin',
  'I.N.',
  'UNIT'
];



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



/* Image source resolver with placeholder
function resolveImageSrc(item) {
  // Safety check
  if (!item?.id || typeof item.id !== 'string') {
    return `${BASE_PATH}/assets/images/ui/placeholder.webp`;
  }

  const albumFolder = item.id.split('-')[0];
  const filename = `${item.id}.webp`;

  return `${BASE_PATH}/assets/images/photocards/${category}/${albumFolder}/${filename}`;
} */



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
)].sort((a, b) => {
  const ia = MEMBER_ORDER.indexOf(a);
  const ib = MEMBER_ORDER.indexOf(b);

  // Both known → follow fixed order
  if (ia !== -1 && ib !== -1) return ia - ib;

  // Known members first
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;

  // Fallback alphabetical for unknowns
  return a.localeCompare(b);
});


  members.forEach(member => {
    const isChecked = persistedMemberFilters[member] !== false;

const label = document.createElement('label');
label.className = 'member-chip';

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

const span = document.createElement('span');
span.textContent = member;

label.appendChild(checkbox);
label.appendChild(span);
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
 * Album statistics
 * - total items
 * - owned count
 * - unowned count 
 * - hearted count
 * - completion percent
 * ********************/
function getAlbumStats(_, allAlbumItems) {
  const total = allAlbumItems.length;

  const ownedCount = allAlbumItems.filter(i => owned[i.id]).length;
  const unownedCount = total - ownedCount;

  const heartedCount = allAlbumItems.filter(i =>
    localStorage.getItem(`heart_${i.id}`) === 'true'
  ).length;

  const percent = total
    ? Math.round((ownedCount / total) * 100)
    : 0;

  return {
    total,
    ownedCount,
    unownedCount,
    heartedCount,
    percent
  };
}


/********************
 * Album header stats text
 * - depends on current filter
 * ********************/
function getAlbumHeaderText(filter, visibleCount, stats) {
  switch (filter) {
    case 'owned':
      return `${stats.ownedCount}/${stats.total} (${stats.percent}%)`;
    case 'unowned':
      return `${stats.unownedCount}/${stats.total} (${100 - stats.percent}%)`;
    case 'hearted':
      return `${stats.heartedCount} on wishlist`;
    default:
      return `${stats.ownedCount}/${stats.total} (${stats.percent}%)`;

  }
}

/********************
 * Heart (wishlist) helper
 ********************/
function createHeartButton(itemId) {
  const btn = document.createElement('button');
  btn.type = 'button';

  const heartKey = `heart_${itemId}`;
  const isHearted = localStorage.getItem(heartKey) === 'true';

  btn.textContent = isHearted ? '❤️' : '🤍';

  // Styling
  btn.className = 'heart-btn';

  btn.onclick = (e) => {
    e.stopPropagation();
    const newState = btn.textContent === '🤍';
    btn.textContent = newState ? '❤️' : '🤍';
    localStorage.setItem(heartKey, newState);
    render();
  };

  return btn;
}




/********************
 * Mobile view checker
 * ********************/
function isMobileView() {
  return window.matchMedia('(max-width: 720px)').matches;
}


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
 * Event listeners
 ********************/
searchInput.addEventListener('input', () => {
  render();
});
ownedFilterSelect.addEventListener('change', () => {
  render();
});


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

//********************
// Mark / unmark entire album
//********************/ 
function markAlbumCollected(albumItems) {
  albumItems.forEach(item => {
    owned[item.id] = true;
  });

  localStorage.setItem('albumTracker_owned', JSON.stringify(owned));
  render();
}
function unmarkAlbumCollected(albumItems) {
  albumItems.forEach(item => {
    delete owned[item.id];
  });

  localStorage.setItem('albumTracker_owned', JSON.stringify(owned));
  render();
}

//********************
// Apply member filters to album items
//********************/
function applyMemberFiltersToAlbumItems(albumItems) {
  return albumItems.filter(i => {
    if (!i.member) return true;
    return persistedMemberFilters[i.member] !== false;
  });
}



//********************
// Load persisted member filters
//********************/
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

  const allItems = CATALOG[category] || [];
  let items = allItems;

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
  if (f === 'hearted') {items = items.filter(i => {return localStorage.getItem(`heart_${i.id}`) === 'true';
  });
}


// Member filter
items = items.filter(i => {
  if (!i.member) return true;
  return persistedMemberFilters[i.member] !== false;
});

// Sort items
  /*items = sortItems(items);*/

  buildMemberFilters(CATALOG[category] || []);

  const ownedCount = items.filter(i => owned[i.id]).length;
  const totalPercent = items.length
  ? Math.round((ownedCount / items.length) * 100)
  : 0;

  progress.textContent =
  `Completion: ${ownedCount}/${items.length} (${totalPercent}%)`;

const albumsAll = {};
const albumsFiltered = {};

// All cards per album (true totals)
allItems.forEach(i => {
  const album = i.album || 'Unknown';
  if (!albumsAll[album]) albumsAll[album] = [];
  albumsAll[album].push(i);
});

// Visible cards per album
items.forEach(i => {
  const album = i.album || 'Unknown';
  if (!albumsFiltered[album]) albumsFiltered[album] = [];
  albumsFiltered[album].push(i);
});



  if (!albumCollapseState[category]) {
    albumCollapseState[category] = {};
  }

Object.entries(albumsAll).forEach(([album, allAlbumItems]) => {
  const albumItems = albumsFiltered[album] || [];
  const sortedAlbumItems = sortItems(albumItems);
  const stats = getAlbumStats(null, allAlbumItems);
  const albumOwned = stats.ownedCount;
  const headerText = getAlbumHeaderText(
  ownedFilterSelect.value,
  sortedAlbumItems.length,
  stats
);
  const collapsed =
    albumCollapseState[category]?.[album] ?? true;

  const triangle = collapsed ? '▶' : '▼';

  /* ===== TABLE HEADER ===== */
const header = document.createElement('tr');
header.className = 'album-header';

const isFullyCollected = albumOwned === stats.total;

const buttonLabel = isFullyCollected
  ? 'Uncheck all cards'
  : 'Check all cards';

const tooltipText = isFullyCollected
  ? "If you press this button, all visible cards in this album will be set to 'Uncollected'. If you do not want this, just wait 10 seconds and this warning will go away."
  : "If you press this button, all visible cards in this album will be set to 'Collected'. If you do not want this, just wait 10 seconds and this warning will go away.";

header.innerHTML = `
  <td colspan="4" class="album-header-cell">
    <span class="album-toggle-icon${collapsed ? '' : ' open'}">\u203A</span>
    <b>${album}</b>
    — ${headerText}
    <button
      class="check-all-btn"
      type="button"
      data-tooltip="${tooltipText}"
      data-action="${isFullyCollected ? 'uncheck' : 'check'}"
    >
      ${buttonLabel}
    </button>
  </td>
`;

const headerCell = header.querySelector('.album-header-cell');
const checkAllBtn = header.querySelector('.check-all-btn');

let countdownInterval = null;
let remainingSeconds = 10;
let awaitingConfirm = false;
let confirmTimeout = null;

const originalText = checkAllBtn.textContent;
const action = checkAllBtn.dataset.action;

function resetConfirmButton() {
  awaitingConfirm = false;
  remainingSeconds = 10;
  checkAllBtn.textContent = originalText;
  checkAllBtn.classList.remove('show-tooltip');
  clearInterval(countdownInterval);
}

checkAllBtn.addEventListener('click', e => {
  e.stopPropagation();

  if (!awaitingConfirm) {
    awaitingConfirm = true;
    remainingSeconds = 10;

    checkAllBtn.classList.add('show-tooltip');
    checkAllBtn.textContent = `Confirm (${remainingSeconds}s)`;

    countdownInterval = setInterval(() => {
      remainingSeconds--;
      checkAllBtn.textContent = `Confirm (${remainingSeconds}s)`;
      if (remainingSeconds <= 0) resetConfirmButton();
    }, 1000);

    confirmTimeout = setTimeout(resetConfirmButton, 10000);
    return;
  }

  clearTimeout(confirmTimeout);
  resetConfirmButton();

  const filteredAlbumItems =
    applyMemberFiltersToAlbumItems(albumItems);

  if (action === 'check') {
    markAlbumCollected(filteredAlbumItems);
  } else {
    unmarkAlbumCollected(filteredAlbumItems);
  }
});



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
  <span class="album-toggle-icon${collapsed ? '' : ' open'}">\u203A</span>
  <b>${album}</b>
— ${headerText}
  <button
    class="check-all-btn"
    type="button"
    data-tooltip="${tooltipText}"
    data-action="${isFullyCollected ? 'uncheck' : 'check'}"
  >
    ${buttonLabel}
  </button>
`;

mobileHeader.onclick = header.onclick;
const mobileBtn = mobileHeader.querySelector('.check-all-btn');

  cardList.appendChild(mobileHeader);
let mobileCountdownInterval = null;
let mobileRemainingSeconds = 10;
let mobileAwaitingConfirm = false;
let mobileConfirmTimeout = null;

const mobileOriginalText = mobileBtn.textContent;
const mobileAction = mobileBtn.dataset.action;

function resetMobileConfirmButton() {
  mobileAwaitingConfirm = false;
  mobileRemainingSeconds = 10;
  mobileBtn.textContent = mobileOriginalText;
  mobileBtn.classList.remove('show-tooltip');
  clearInterval(mobileCountdownInterval);
}

mobileBtn.addEventListener('click', e => {
  e.stopPropagation();

  // First click → arm confirmation
  if (!mobileAwaitingConfirm) {
    mobileAwaitingConfirm = true;
    mobileRemainingSeconds = 10;

    mobileBtn.classList.add('show-tooltip');
    mobileBtn.textContent = `Confirm (${mobileRemainingSeconds}s)`;

    mobileCountdownInterval = setInterval(() => {
      mobileRemainingSeconds--;
      mobileBtn.textContent = `Confirm (${mobileRemainingSeconds}s)`;

      if (mobileRemainingSeconds <= 0) {
        resetMobileConfirmButton();
      }
    }, 1000);

    mobileConfirmTimeout = setTimeout(
      resetMobileConfirmButton,
      10000
    );
    return;
  }

  // Second click → confirm
  clearTimeout(mobileConfirmTimeout);
  resetMobileConfirmButton();

  const filteredAlbumItems =
    applyMemberFiltersToAlbumItems(albumItems);

  if (mobileAction === 'check') {
    markAlbumCollected(filteredAlbumItems);
  } else {
    unmarkAlbumCollected(filteredAlbumItems);
  }
});



 if (collapsed) return;

// 🌫️ Empty album hint
if (sortedAlbumItems.length === 0) {
  // --- Desktop (table row)
  const emptyRow = document.createElement('tr');
  emptyRow.className = 'album-empty-row';
  emptyRow.innerHTML = `
    <td colspan="4" class="album-empty-hint">
      No matching cards
    </td>
  `;
  list.appendChild(emptyRow);

  // --- Mobile (card view)
  const emptyCard = document.createElement('div');
  emptyCard.className = 'album-empty-card';
  emptyCard.textContent = 'No matching cards';
  cardList.appendChild(emptyCard);

  return;
}

  /* ===== ITEMS ===== */
    sortedAlbumItems.forEach(i => {
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

// Image wrapper (for heart overlay)
const imgWrap = document.createElement('div');
imgWrap.className = 'pc-img-wrap';

const tableImg = document.createElement('img');
applyImageProps(tableImg, i);

// ❤️ Heart (wishlist) button — list view
const heart = createHeartButton(i.id);

imgWrap.appendChild(tableImg);
imgWrap.appendChild(heart);
tdImg.appendChild(imgWrap);
tr.appendChild(tdImg);
list.appendChild(tr);

//********************
// Mobile card view
//********************/
//********************
// Mobile card view
//********************/
const card = document.createElement('div');
card.className = 'card' + (owned[i.id] ? ' owned' : '');
card.appendChild(
  createCheckbox(!!owned[i.id], () => toggle(i.id))
);

// 🔒 isolate scope to avoid redeclaration
{
const imgWrap = document.createElement('div');
imgWrap.className = 'pc-img-wrap';

const cardImg = document.createElement('img');
applyImageProps(cardImg, i);

const heart = createHeartButton(i.id);

imgWrap.appendChild(cardImg);
imgWrap.appendChild(heart);
card.appendChild(imgWrap);

}

// text
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


      cardList.appendChild(card);
  });
});

//********************
// Grid view renderer
//********************/ 
function renderGridView(allItems, filteredItems) {

  const gridView = document.getElementById('gridView');
  gridView.innerHTML = '';

const albumsAll = {};
const albumsFiltered = {};

// All cards (true album totals)
allItems.forEach(i => {
  const album = i.album || 'Unknown';
  if (!albumsAll[album]) albumsAll[album] = [];
  albumsAll[album].push(i);
});

// Visible cards only
filteredItems.forEach(i => {
  const album = i.album || 'Unknown';
  if (!albumsFiltered[album]) albumsFiltered[album] = [];
  albumsFiltered[album].push(i);
});



Object.entries(albumsAll).forEach(([album, allAlbumItems]) => {
  const albumItems = albumsFiltered[album] || [];
  const collapsed = albumCollapseState[category][album] ?? true;


  // Album completion (grid view)
const stats = getAlbumStats(null, allAlbumItems);
const isFullyCollected = stats.ownedCount === stats.total;

// Header text
const headerText = getAlbumHeaderText(
  ownedFilterSelect.value,
  albumItems.length,
  stats
);

// Album title
const title = document.createElement('h3');
title.className = 'album-header-card';

const buttonLabel = isFullyCollected
  ? 'Uncheck visible cards'
  : 'Check visible cards';

const tooltipText = isFullyCollected
  ? "If you press this button, all currently visible cards in this album will be set to 'Uncollected'. If you do not want this, just wait 10 seconds and this warning will go away."
  : "If you press this button, all currently visible cards in this album will be set to 'Collected'. If you do not want this, just wait 10 seconds and this warning will go away.";

title.innerHTML = `
  <span class="album-toggle-icon${collapsed ? '' : ' open'}">\u203A</span>
  <b>${album}</b>
— ${headerText}
  <button
    class="check-all-btn"
    type="button"
    data-tooltip="${tooltipText}"
    data-action="${isFullyCollected ? 'uncheck' : 'check'}"
  >
    ${buttonLabel}
  </button>
`;




title.onclick = () => {
  albumCollapseState[category][album] = !collapsed;
  localStorage.setItem(
    ALBUM_COLLAPSE_KEY,
    JSON.stringify(albumCollapseState)
  );
  render();
};

const checkAllBtn = title.querySelector('.check-all-btn');

let countdownInterval = null;
let remainingSeconds = 10;
let awaitingConfirm = false;
let confirmTimeout = null;

const originalText = checkAllBtn.textContent;
const action = checkAllBtn.dataset.action;

function resetConfirmButton() {
  awaitingConfirm = false;
  remainingSeconds = 10;
  checkAllBtn.textContent = originalText;
  checkAllBtn.classList.remove('show-tooltip');
  clearInterval(countdownInterval);
}

checkAllBtn.addEventListener('click', e => {
  e.stopPropagation();

  // First click → arm confirmation
  if (!awaitingConfirm) {
    awaitingConfirm = true;
    remainingSeconds = 10;

    checkAllBtn.classList.add('show-tooltip');
    checkAllBtn.textContent = `Confirm (${remainingSeconds}s)`;

    countdownInterval = setInterval(() => {
      remainingSeconds--;
      checkAllBtn.textContent = `Confirm (${remainingSeconds}s)`;

      if (remainingSeconds <= 0) {
        resetConfirmButton();
      }
    }, 1000);

    confirmTimeout = setTimeout(resetConfirmButton, 10000);
    return;
  }

  // Second click → confirm
  clearTimeout(confirmTimeout);
  resetConfirmButton();

const filteredAlbumItems =
  applyMemberFiltersToAlbumItems(albumItems);

if (action === 'check') {
  markAlbumCollected(filteredAlbumItems);
} else {
  unmarkAlbumCollected(filteredAlbumItems);
}

});


gridView.appendChild(title);

if (collapsed) return;

// 🌫️ Empty album hint
if (albumItems.length === 0) {
  const empty = document.createElement('div');
  empty.className = 'grid-empty-hint';
  empty.textContent = 'No matching cards';
  gridView.appendChild(empty);

  // Spacer still added
  const separator = document.createElement('div');
  separator.className = 'grid-album-separator';
  gridView.appendChild(separator);
  return;
}
    // Album grid
    const grid = document.createElement('div');
    grid.className = 'album-grid';

    albumItems.forEach(i => {
      const card = document.createElement('div');
      card.className = 'grid-card' + (owned[i.id] ? ' owned' : '');

      /* Image
      const img = document.createElement('img');
      img.src = resolveImageSrc(i);
      img.loading = 'lazy';
      img.onerror = () => {
        img.onerror = null;
        img.src = `${BASE_PATH}/assets/images/ui/placeholder.webp`;
      };
      */

      // Image with applyImageProps
      const img = document.createElement('img');
      applyImageProps(img, i);

      // Heart (favorite) button
      const heart = createHeartButton(i.id);

      // Name
      const name = document.createElement('div');
      name.className = 'grid-name';
      name.textContent = i.name;

      // Checkmark
      const check = createCheckbox(!!owned[i.id], () => toggle(i.id));

      card.appendChild(img);
      card.appendChild(heart);
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
  renderGridView(allItems, items);
  return;
}


  updateToggleAlbumsButton();
}

// Mobile-friendly tooltip locking
document.addEventListener('click', (e) => {
  const hint = e.target.closest('.export-hint');
  const allHints = document.querySelectorAll('.export-hint');

  // Close all tooltips first
  allHints.forEach(h => {
    if (h !== hint) h.classList.remove('tooltip-open');
  });

  // If clicking the info icon, toggle its tooltip
  if (hint && e.target.classList.contains('info-icon')) {
    e.preventDefault();
    hint.classList.toggle('tooltip-open');
  }
});

// Prevent clicks inside tooltip from closing it
document.querySelectorAll('.info-tooltip').forEach(tip => {
  tip.addEventListener('click', e => e.stopPropagation());
});


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