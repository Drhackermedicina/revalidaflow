/**
 * Icon Cache System to reduce Iconify API calls
 * Caches frequently used icons locally to improve performance
 */

import { loadIcons } from '@iconify/vue';

// Cache for storing loaded icons
const iconCache = new Map();

// List of frequently used icons to preload
const frequentIcons = [
  'ri:plus-line',
  'ri:check-line',
  'ri:menu-line',
  'ri:close-line',
  'ri:settings-3-line',
  'ri:pencil-line',
  'ri:eye-line',
  'ri:upload-cloud-2-line',
  'ri:list-ordered',
  'ri:play-line',
  'ri:arrow-up-s-line',
  'ri:arrow-down-s-line',
  'ri:star-line',
  'ri:star-fill'
];

/**
 * Preload frequently used icons
 */
export async function preloadIcons() {
  if (typeof window === 'undefined') return;

  try {

    // Load icons in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < frequentIcons.length; i += batchSize) {
      const batch = frequentIcons.slice(i, i + batchSize);
      await loadIcons(batch);

      // Cache the icons as loaded
      batch.forEach(icon => {
        iconCache.set(icon, true);
      });
    }

  } catch (error) {
    console.warn('Failed to preload icons:', error);
  }
}

/**
 * Check if an icon is cached
 */
export function isIconCached(iconName) {
  return iconCache.has(iconName);
}

/**
 * Add icon to cache
 */
export function cacheIcon(iconName) {
  iconCache.set(iconName, true);
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: iconCache.size,
    icons: Array.from(iconCache.keys())
  };
}