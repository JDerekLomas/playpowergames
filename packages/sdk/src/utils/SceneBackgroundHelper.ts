let activeBuffer = 1;
// Store image Base64 encodings by URL
const imageCache: Record<string, string> = {};

/**
 * Converts an image to Base64 format
 * @param url URL of the image to convert
 * @returns Promise that resolves with the Base64 string
 */
function imageToBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Handle CORS if needed
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}

/**
 * Preloads images for CSS background use by converting them to Base64
 * @param imageUrls Array of image URLs to preload
 * @returns Promise that resolves when all images are converted and cached
 */
export function preloadBackgroundImages(imageUrls: string[]): Promise<void> {
    // Filter out already cached images
    const uncachedUrls = imageUrls.filter(url => !imageCache[url]);

    if (uncachedUrls.length === 0) {
        return Promise.resolve();
    }

    const loadPromises = uncachedUrls.map(url =>
        imageToBase64(url)
            .then(base64 => {
                imageCache[url] = base64;
            })
            .catch(err => {
                console.error(`Failed to convert image to Base64: ${url}`, err);
            })
    );
    const isSame = imageCache[imageUrls[0]] === imageCache[imageUrls[1]];
    console.log('isSame', isSame);

    return Promise.all(loadPromises).then(() => {
        console.log('All images converted to Base64');
    });
}

export function setSceneBackground(imageUrl: string) {
    // Set the inactive buffer to the new image
    const inactiveBuffer = activeBuffer === 1 ? 2 : 1;

    // Use Base64 version if available, otherwise use the URL
    const backgroundValue = imageCache[imageUrl]
        ? `url(${imageCache[imageUrl]})`
        : `url('${imageUrl}')`;

    // Set the background image
    document.body.style.setProperty(`--scene-bg-${inactiveBuffer}`, backgroundValue);

    // Allow a small delay for the browser to process the new background image
    setTimeout(() => {
        // Fade in the inactive buffer and fade out the active one
        document.body.style.setProperty(`--scene-bg-${inactiveBuffer}-opacity`, '1');
        document.body.style.setProperty(`--scene-bg-${activeBuffer}-opacity`, '0');

        // Toggle active buffer
        activeBuffer = inactiveBuffer;
    }, 16); // Approximately one frame at 60fps
}