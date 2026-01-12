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
checkbox.value = member; // ✅ CRITICAL
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

  const heartedCount = allAlbumItems.filter(i => {
  const v = localStorage.getItem(`heart_${i.id}`);
  return v === 'true' || v === 'red' || v === 'gold';
  }).length;


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
/***********************************
 * Get active member filters helper
 * ********************************/
function getActiveMemberFilters() {
  return Array.from(
    document.querySelectorAll('#memberFilters input[type="checkbox"]:checked')
  ).map(cb => cb.value);
}

/*****************************
 * Get expanded albums helper
 * **************************/
function isAlbumExpanded(album) {
  return albumCollapseState?.[category]?.[album] === false;
}


/********************
 * Heart (wishlist) helper
 ********************/
function createHeartButton(itemId) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'heart-btn';

  const heartKey = `heart_${itemId}`;

  // ---- BACKWARD COMPATIBILITY ----
  // Old data: 'true'  → red
  // New data: 'red' | 'gold'
  let state = localStorage.getItem(heartKey);

  if (state === 'true') {
    state = 'red';
    localStorage.setItem(heartKey, 'red');
  }

function applyState() {
switch (state) {
    case 'red':
      btn.textContent = '❤️';
      break;
    case 'gold':
      btn.textContent = '💛';
      break;
    default:
      btn.textContent = '🤍';
  }
}


  applyState();

  btn.onclick = (e) => {
    e.stopPropagation();

    // Cycle: empty → red → gold → empty
    if (!state) state = 'red';
    else if (state === 'red') state = 'gold';
    else state = null;

    if (state) {
      localStorage.setItem(heartKey, state);
    } else {
      localStorage.removeItem(heartKey);
    }

    applyState();
    render();
  };

  return btn;
}

/***************************
 * Apply wishlist gold class
 * ************************/
function applyWishlistGoldClass(container, itemId) {
  const heart = localStorage.getItem(`heart_${itemId}`);

  if (heart === 'gold') {
    container.classList.add('wishlist-gold');
  }
}


/**********************************
 * Set export wishlist button state
 * ********************************/
function setExportWishlistDisabled(disabled) {
  const btn = document.getElementById("exportWishlistBtn");
  if (!btn) return;

  if (disabled) {
    // Save original label once
    if (!btn.dataset.originalText) {
      btn.dataset.originalText = btn.innerHTML;
    }

    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.style.cursor = "not-allowed";

    btn.innerHTML = `
      <span class="export-spinner"></span>
      Preparing…
    `;
  } else {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";

    // Restore original label
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
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

/**********************
 * Export wishlist
 * ********************/
// window.exportWishlist = function () {
//   // Get all hearted item IDs
//   const heartedIds = Object.keys(localStorage)
//     .filter(k => k.startsWith('heart_') && localStorage.getItem(k) === 'true')
//     .map(k => k.replace('heart_', ''));

//   if (!heartedIds.length) {
//     alert('No wishlist items yet!');
//     return;
//   }

//   // Match against your master item list
//   const items = allAlbumItems.filter(i => heartedIds.includes(String(i.id)));

//   // Open a new tab
//   const w = window.open('', '_blank');

//   // Basic document
//   w.document.write(`
// <!DOCTYPE html>
// <html>
// <head>
// <meta charset="UTF-8">
// <title>My Wishlist</title>
// <link rel="stylesheet" href="${BASE_PATH}css/styles.css">
// <style>
//   body {
//     background: #0f0f10;
//     color: #eaeaea;
//     padding: 16px;
//   }
//   h1 {
//     text-align: center;
//     margin-bottom: 16px;
//   }
//   .album-grid {
//     max-width: 1400px;
//   }
//   .grid-card .heart-btn {
//     display: none; /* no interaction */
//   }
// </style>
// </head>
// <body>
// <h1>❤️ My Photocard Wishlist</h1>
// <div class="album-grid">
// </div>
// </body>
// </html>
// `);

//   const grid = w.document.querySelector('.album-grid');

//   items.forEach(item => {
//     const card = w.document.createElement('div');
//     card.className = 'grid-card';

//     const img = w.document.createElement('img');
//     img.src = resolveImageSrc(item.image);
//     img.alt = item.name;

//     const name = w.document.createElement('div');
//     name.className = 'grid-name';
//     name.textContent = item.name;

//     card.appendChild(img);
//     card.appendChild(name);
//     grid.appendChild(card);
//   });

//   w.document.close();
// };


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
 * Toast helper
 *******************/
function showToast(message, {
  duration = 3000,
  persistent = false
} = {}) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  if (!persistent) {
    setTimeout(() => hideToast(toast), duration);
  }

  return toast;
}

function hideToast(toast) {
  if (!toast) return;
  toast.classList.remove("show");
  setTimeout(() => toast.remove(), 250);
}




/*********************************
 * Export wishlist button listener
 * ******************************/
document
  .getElementById("exportWishlistBtn")
  .addEventListener("click", exportWishlistImage);

function exportWishlistImage() {


  
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isFirefoxIOS = /FxiOS/.test(navigator.userAgent);

// ✅ Show toast FIRST
if (isIOS && isFirefoxIOS) {
  showToast(
    "Firefox iOS doesn’t allow auto-download. Long-press the image to save.",
    { duration: 6000 }
  );
}


// Firefox iOS: open tab immediately (must be sync with user gesture)
let firefoxTab = null;
if (isIOS && isFirefoxIOS) {
  firefoxTab = window.open('', '_blank');
}


  setExportWishlistDisabled(true);
  const allItems = CATALOG[category] || [];

  // Get wishlisted items from localStorage
const activeMembers = getActiveMemberFilters();

const wishlistItems = sortItemsLikeUI(
  allItems.filter(item => {
    const heart = localStorage.getItem(`heart_${item.id}`);

    // ❤️ must be wishlisted (legacy + red + gold)
    if (heart !== 'true' && heart !== 'red' && heart !== 'gold') {
      return false;
    }

    // 👤 member filter
    if (activeMembers.length > 0 && !activeMembers.includes(item.member)) {
      return false;
    }

    // 📂 expanded albums only
    if (!isAlbumExpanded(item.album)) {
      return false;
    }

    return true;
  })
);


  // 🚫 Stop if empty
  if (wishlistItems.length === 0) {
    showToast("Your wishlist is empty, Heart/Wishlist some cards first!");
      setExportWishlistDisabled(false); // ✅ re-enable
    return;
  }
  
  // Show progress toast
  const progressToast = showToast(
  "⏳ Preparing wishlist…",
  { persistent: true }
);

  // Create container for rendering
  const container = document.createElement("div");
  container.id = "wishlist-export";

  // Update progress toast
  progressToast.textContent = "🖼️ Rendering wishlist image…";

  // Sort by album, then name
  // wishlistItems.sort((a, b) => {
  //   const albumA = a.album || '';
  //   const albumB = b.album || '';
  //   if (albumA !== albumB) return albumA.localeCompare(albumB);
  //   return (a.name || '').localeCompare(b.name || '');
  // });

  // Group by album
  const itemsByAlbum = {};
  wishlistItems.forEach(item => {
    const album = item.album || 'Unknown Album';
    if (!itemsByAlbum[album]) itemsByAlbum[album] = [];
    itemsByAlbum[album].push(item);
  });

//   // Build HTML
//   const itemsHTML = Object.entries(itemsByAlbum)
//     .map(([album, items]) => `
//       <div class="wishlist-album">
//         <h3 class="wishlist-album-title">${album}</h3>
//         <div class="wishlist-grid">
//           ${items
//         .map(item => `
//           <div class="wishlist-item">
//             <img
//               src="${resolveImageSrc(item)}"
//               loading="eager"
//               decoding="sync"
//               crossorigin="anonymous"
//             >
//             <div class="wishlist-name">${item.name}</div>
//           </div>
//         `)
//             .join("")}
//         </div>
//       </div>
//     `)
//     .join("");

// container.innerHTML = `
//   <h2>My Stray Kids PC Wishlist ❤️</h2>
//   ${itemsHTML}
// `;

container.innerHTML = `<h2>My Stray Kids PC Wishlist ❤️</h2>`;

Object.entries(itemsByAlbum).forEach(([album, items]) => {
  const albumWrap = document.createElement('div');
  albumWrap.className = 'wishlist-album';

  const title = document.createElement('h3');
  title.className = 'wishlist-album-title';
  title.textContent = album;
  albumWrap.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'wishlist-grid';

  items.forEach(item => {
    const itemWrap = document.createElement('div');
    itemWrap.className = 'wishlist-item';
    // 💛 Gold wishlist styling for export
    if (localStorage.getItem(`heart_${item.id}`) === 'gold') {
      itemWrap.classList.add('wishlist-gold');
    }


    const img = document.createElement('img');
    applyImageProps(img, item, { eager: true });
    img.setAttribute('crossorigin', 'anonymous');

    const name = document.createElement('div');
    name.className = 'wishlist-name';
    name.textContent = item.name;

    itemWrap.appendChild(img);
    itemWrap.appendChild(name);
    grid.appendChild(itemWrap);
  });

  albumWrap.appendChild(grid);
  container.appendChild(albumWrap);

});
// ===== Watermark / footer (ONLY ONCE, AT END) =====
const footer = document.createElement("div");
footer.className = "wishlist-footer";
footer.innerHTML = `
  Wishlist generated for free on:
  <br>
  <a href="https://craftenskz.github.io/StrayKidsPCCollector/">
    https://craftenskz.github.io/StrayKidsPCCollector/
  </a>
`;

container.appendChild(footer);


  document.body.appendChild(container);

html2canvas(container, {
  backgroundColor: "#0f0f10",
  scale: 2,
  useCORS: true
}).then(canvas => {
  hideToast(progressToast);

  showToast("✅ Wishlist exported!");

canvas.toBlob(blob => {
  const url = URL.createObjectURL(blob);

  if (isIOS && isFirefoxIOS && firefoxTab) {
  const doc = firefoxTab.document;

  doc.open();
  doc.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Save Wishlist Image</title>

  <style>
    :root {
      --bg: #0f0f10;
      --fg: #eaeaea;
      --muted: #aaa;
      --accent: #ff6fae;
    }

    body {
      margin: 0;
      padding-bottom: 64px; /* space for return bar */
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      text-align: center;
    }

    /* Instruction banner */
    .hint {
      position: sticky;
      top: 0;
      background: rgba(20,20,22,0.95);
      backdrop-filter: blur(8px);
      padding: 12px 14px;
      font-size: 14px;
      border-bottom: 1px solid #222;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      animation: slideDown .25s ease;
      z-index: 10;
    }

    .hint-text {
      text-align: left;
      flex: 1;
    }

    .hint button {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 16px;
      cursor: pointer;
    }

    /* Image */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    /* Persistent return bar */
    .return-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(20,20,22,0.98);
      border-top: 1px solid #222;
      padding: 12px;
      text-align: center;
      font-size: 14px;
    }

    .return-bar a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }

    @keyframes slideDown {
      from { transform: translateY(-100%); }
      to   { transform: translateY(0); }
    }
  </style>
</head>

<body>

  <!-- Instruction banner (auto-hides) -->
  <div class="hint" id="hint">
    <div class="hint-text">
      📱 <b>Firefox iOS:</b> Long-press the image below and choose <b>Save Image</b>
    </div>
    <button onclick="dismissHint()">✕</button>
  </div>

  <!-- Image -->
  <img src="${url}" alt="Wishlist Image">

  <!-- Persistent return button -->
  <div class="return-bar">
    <a href="#" onclick="window.close(); return false;">
      ← Return to app
    </a>
  </div>

  <script>
    function dismissHint() {
      const h = document.getElementById('hint');
      if (h) h.remove();
    }

    // Auto-hide instruction after 10s
    setTimeout(dismissHint, 10000);
  </script>

</body>
</html>
`);

  doc.close();
}
 else {
    const link = document.createElement("a");
    link.href = url;
    link.download = "skz-wishlist.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 3000);
});


  container.remove();

  setExportWishlistDisabled(false); // ✅ re-enable
}).catch(err => {
  hideToast(progressToast);
  showToast("❌ Failed to export wishlist");
  console.error(err);

  setExportWishlistDisabled(false); // ✅ re-enable on error
});


}




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
//***********************
// Sorting helper like UI
//***********************/
function sortItemsLikeUI(items) {
  if (!sortState || !sortState.key) return [...items];

  return [...items].sort((a, b) => {
    let va, vb;

    switch (sortState.key) {
      case 'name':
        va = a.name || '';
        vb = b.name || '';
        break;

      case 'member':
        va = a.member || '';
        vb = b.member || '';
        break;

      case 'collected':
        va = a.owned ? 1 : 0;
        vb = b.owned ? 1 : 0;
        break;

      default:
        return 0;
    }

    if (va < vb) return -1 * sortState.dir;
    if (va > vb) return  1 * sortState.dir;
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

  const select = document.getElementById('categorySelect');
  if (select) select.value = c;

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


function cardMatchesMember(card, matchedMember) {
  if (!matchedMember) return true;

  const normalize = (str) =>
    (str || '')
      .toLowerCase()
      .replace(/[,&+/.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const memberStr = normalize(card.member);
  const nameStr   = normalize(card.name);

  // Multi-word member (e.g. "bang chan")
  if (matchedMember.includes(' ')) {
    return (
      memberStr === matchedMember ||
      nameStr.includes(matchedMember)
    );
  }

  // Single-word member (e.g. "han")
  const memberWords = memberStr.split(' ');
  const nameWords   = nameStr.split(' ');

  return (
    memberWords.includes(matchedMember) ||
    nameWords.includes(matchedMember)
  );
}





function render() {
  list.innerHTML = '';
  cardList.innerHTML = '';

let matchedMember = null; // ✅ DEFINE ONCE, TOP-LEVEL

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
const isSingleWord = !q.includes(' ');
if (q) {
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  // Try to detect a full member phrase at the start
const allMembers = MEMBER_ORDER
  .map(m => m.toLowerCase());


  // Find the longest matching member name (multi-word)
  let memberTokenCount = 0;

  for (const member of allMembers) {
    const memberWords = member.split(/\s+/);

    // Check if the beginning of terms matches this member
if (member.startsWith(terms.join(' '))) 
  {
      // Keep the longest match
      if (!matchedMember || memberWords.length > memberTokenCount) {
        matchedMember = member;
        memberTokenCount = memberWords.length;
      }
    }
  }

  // If we found a member phrase, drop those tokens
  let additionalTerms = terms;
  if (matchedMember) {
    additionalTerms = terms.slice(memberTokenCount);
  }

  items = items.filter(i => {
    const nameLC = (i.name || '').toLowerCase();
    const albumLC = (i.album || '').toLowerCase();
    const memberLC = (i.member || '').toLowerCase();

if (!cardMatchesMember(i, matchedMember)) {
  return false;
}

    // 2) Now apply remaining terms (AND logic) to name/album
    return additionalTerms.every(term => {
      // match in name or album
      return (
        nameLC.includes(term) ||
        albumLC.includes(term)
      );
    });
  });
}


updateSortIndicators();
  const f = ownedFilterSelect.value;
  if (f === 'owned') items = items.filter(i => owned[i.id]);
  if (f === 'unowned') items = items.filter(i => !owned[i.id]);
  if (f === 'hearted') {items = items.filter(i => {return localStorage.getItem(`heart_${i.id}`) === 'true';
  });
}

// Member filter
// Member filter (ONLY when not searching for a member)
if (!matchedMember) {
  items = items.filter(i => {
    if (!i.member) return true;
    return persistedMemberFilters[i.member] !== false;
  });
}


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
applyWishlistGoldClass(imgWrap, i.id);


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
const card = document.createElement('div');
card.className = 'card' + (owned[i.id] ? ' owned' : '');
applyWishlistGoldClass(card, i.id);
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
      applyWishlistGoldClass(card, i.id);
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


document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('categorySelect');
  if (select) select.value = category;
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