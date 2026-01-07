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

/**
 * Resolve photocard image source from item
 */
export function resolveImageSrc(item) {
  if (!item?.id || typeof item.id !== 'string') {
    return `${BASE_PATH}assets/images/ui/placeholder.webp`;
  }

  const albumFolder = item.id.split('-')[0];
  const filename = `${item.id}.webp`;

  return `${BASE_PATH}assets/images/photocards/${item.category || ''}/${albumFolder}/${filename}`;
}

/**
 * Apply common image behavior (lazy, size, fallback)
 */
export function applyImageProps(img, item) {
  img.src = resolveImageSrc(item);
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 50;
  img.height = 80;

  img.onerror = () => {
    img.onerror = null;
    img.src = `${BASE_PATH}assets/images/ui/placeholder.webp`;
  };
}
