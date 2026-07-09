/***************************************************
 * Image utilities – Skz Photocard Tracker
 ***************************************************/

/**
 * Detect correct base path automatically
 * - Local dev: /
 * - GitHub Pages: /StrayKidsPCCollector/
 */
export const BASE_PATH = location.hostname.includes('github.io')
  ? '/StrayKidsPCCollector/'
  : '/';

const MEMBER_PLACEHOLDERS = {
  'bang chan': 'BangChan.jpeg',
  'lee know': 'LeeKnow.jpeg',
  changbin: 'Changbin.jpeg',
  hyunjin: 'Hyunjin.jpeg',
  han: 'Han.jpeg',
  felix: 'Felix.jpeg',
  seungmin: 'Seungmin.jpeg',
  'i.n.': 'IN.jpeg',
  'i.n': 'IN.jpeg',
  in: 'IN.jpeg',
  unit: 'Unit.jpeg'
};

const MEMBER_PLACEHOLDER_CATEGORIES = new Set([
  'japanese_albums',
  'korean_albums',
  'korean_pob',
  'japanese_pob'
]);

const FALLBACK_PLACEHOLDER = `${BASE_PATH}assets/images/ui/placeholder.webp`;

function normalizeMember(member) {
  return String(member || '')
    .trim()
    .toLowerCase();
}

export function resolvePlaceholderSrc(item) {
  const category = item?.category || '';
  const placeholder = MEMBER_PLACEHOLDERS[normalizeMember(item?.member)];

  if (MEMBER_PLACEHOLDER_CATEGORIES.has(category) && placeholder) {
    return `${BASE_PATH}assets/images/ui/${placeholder}`;
  }

  return FALLBACK_PLACEHOLDER;
}

/**
 * Resolve photocard image source from item
 */
export function resolveImageSrc(item) {
  if (!item?.id || typeof item.id !== 'string') {
    return resolvePlaceholderSrc(item);
  }

  const albumFolder = item.id.split('-')[0];
  const filename = `${item.id}.webp`;

  return `${BASE_PATH}assets/images/photocards/${item.category || ''}/${albumFolder}/${filename}`;
}

export function applyImageProps(img, item, { eager = false } = {}) {
  img.src = resolveImageSrc(item);
  img.alt = item.name || '';
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.fetchPriority = eager ? 'high' : 'low';

  img.onerror = () => {
    img.onerror = null;
    img.src = resolvePlaceholderSrc(item);
  };
}
