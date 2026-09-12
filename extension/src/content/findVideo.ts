/**
 * Locates the "real" playable <video> element on a page, ignoring ad/background
 * loops and thumbnail previews. Streaming sites usually construct the element
 * via JS (JWPlayer/Video.js/HLS.js/etc.) after the page loads, so we watch for
 * late DOM insertions and re-score as metadata becomes available.
 */

const MIN_AREA_PX = 40_000; // roughly 200x200 — filters out thumbnails/ad slivers
const RESCAN_DEBOUNCE_MS = 250;

function scoreVideo(video: HTMLVideoElement): number {
  const rect = video.getBoundingClientRect();
  const area = rect.width * rect.height;
  if (area < MIN_AREA_PX) return -Infinity;
  if (rect.width === 0 || rect.height === 0) return -Infinity;

  let score = area;
  if (!Number.isNaN(video.duration) && video.duration > 30) score += 1_000_000;
  if (!video.muted) score += 500_000;
  return score;
}

export function findAndWatchVideo(onFound: (video: HTMLVideoElement) => void): () => void {
  let current: HTMLVideoElement | null = null;
  let debounceHandle: number | undefined;
  const watchedMetadata = new WeakSet<HTMLVideoElement>();

  function rescan() {
    const candidates = [...document.querySelectorAll("video")];
    let best: HTMLVideoElement | null = null;
    let bestScore = -Infinity;

    for (const video of candidates) {
      if (!watchedMetadata.has(video)) {
        watchedMetadata.add(video);
        video.addEventListener("loadedmetadata", scheduleRescan, { once: true });
      }
      const score = scoreVideo(video);
      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    }

    if (best && best !== current && bestScore > -Infinity) {
      current = best;
      onFound(best);
    }
  }

  function scheduleRescan() {
    if (debounceHandle) window.clearTimeout(debounceHandle);
    debounceHandle = window.setTimeout(rescan, RESCAN_DEBOUNCE_MS);
  }

  scheduleRescan();

  const observer = new MutationObserver(scheduleRescan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (debounceHandle) window.clearTimeout(debounceHandle);
  };
}
