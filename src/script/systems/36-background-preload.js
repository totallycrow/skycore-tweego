/* =========================================================================
   BackgroundPreload: Preload and decode background images to prevent flicker
   
   Prevents the "room background becomes active but image isn't decoded yet" gap
   that causes flicker when navigating between passages.
========================================================================= */
(function () {
  "use strict";

  window.Skycore = window.Skycore || {};
  Skycore.Systems = Skycore.Systems || {};

  const cache = new Map(); // url -> Promise

  /**
   * Preloads a single image and waits for it to decode
   * @param {string} url - Image URL to preload
   * @returns {Promise} - Resolves when image is loaded/decoded
   */
  function preload(url) {
    if (!url) return Promise.resolve();
    if (cache.has(url)) return cache.get(url);

    const p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
      // decode() prevents "first frame blank" on many browsers
      if (img.decode) {
        img.decode().then(resolve).catch(resolve);
      } else {
        img.onload = resolve;
        img.onerror = resolve; // Don't block on missing assets
      }
    });

    cache.set(url, p);
    return p;
  }

  /**
   * Gets the URL for a background preset
   * @param {string} preset - Preset name (e.g., "bedroom", "bedroom-vertical")
   * @returns {string|null} - URL or null if not an image preset
   */
  function getPresetUrl(preset) {
    // Only image-based presets need preloading
    const imagePresets = {
      "bedroom": "assets/rooms/bedroom-default.webp",
      "bedroom-vertical": "assets/rooms/bedroom-vertical.webp"
    };
    return imagePresets[preset] || null;
  }

  /**
   * Preloads all background images from the registry
   * Called on story ready to preload all backgrounds upfront
   */
  async function preloadAllFromRegistry() {
    const PRESETS = ["bedroom", "bedroom-vertical"]; // Only image presets
    const urls = PRESETS.map(getPresetUrl).filter(Boolean);
    await Promise.all(urls.map(preload));
  }

  /**
   * Preloads the background for a given preset
   * @param {string} preset - Preset name
   * @returns {Promise} - Resolves when image is preloaded
   */
  async function preloadPreset(preset) {
    const url = getPresetUrl(preset);
    if (url) {
      return preload(url);
    }
    return Promise.resolve();
  }

  Skycore.Systems.BackgroundPreload = {
    preload,
    preloadAllFromRegistry,
    preloadPreset,
    getPresetUrl
  };
})();
