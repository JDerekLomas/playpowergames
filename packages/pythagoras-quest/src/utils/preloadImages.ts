// Shared image preloader utility for Pythagoras Quest
// Ensures: single location to tweak logic (decode, concurrency, error handling, caching)

const inFlight: Map<string, Promise<void>> = new Map();
const loaded: Set<string> = new Set();

export interface PreloadOptions {
  tolerateErrors?: boolean; // resolve even if some fail (default true)
  decode?: boolean;         // attempt HTMLImageElement.decode when available
}

export const preloadImages = (sources: string[], opts: PreloadOptions = {}): Promise<void> => {
  const { tolerateErrors = true, decode = true } = opts;
  const unique = sources.filter((s, i) => sources.indexOf(s) === i);
  const tasks = unique.map(src => {
    if (loaded.has(src)) return Promise.resolve();
    if (inFlight.has(src)) return inFlight.get(src)!;

    const p = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const finish = () => { loaded.add(src); inFlight.delete(src); resolve(); };
        if (decode && 'decode' in img) {
          // decode() sometimes throws for cross-origin or SVG, so fall back
          (img as any).decode?.().then(finish).catch(finish);
        } else finish();
      };
      img.onerror = () => {
        inFlight.delete(src);
        if (tolerateErrors) { console.warn('[preloadImages] failed', src); resolve(); } else reject(new Error(`Failed to load ${src}`));
      };
      img.src = src;
    });

    inFlight.set(src, p);
    return p;
  });
  return Promise.all(tasks).then(() => {});
};

export const markImagesLoaded = (sources: string[]) => sources.forEach(s => loaded.add(s));
