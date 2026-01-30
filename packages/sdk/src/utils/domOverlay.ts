/**
 * Toggle DOM overlay visibility on scene changes (e.g. GameScene to HelpScene)
 */
export function setDomOverlaysEnabled(scene: Phaser.Scene, enabled: boolean) {
    const children = (scene.children.getAll() as any[]);
    for (const obj of children) {
        if ((obj as any).type !== 'DOMElement') continue;

        const domEl = obj as Phaser.GameObjects.DOMElement;
        const node = (domEl as any).node as HTMLElement | undefined;
        if (!node) continue;

        const stash = ((domEl as any).__overlayStash ||= {
            tabIndex: node.tabIndex,
            pointerEvents: node.style.pointerEvents,
            display: node.style.display,
            ariaHidden: node.getAttribute('aria-hidden'),
        });

        if (!enabled) {
            node.setAttribute('aria-hidden', 'true');
            (node as any).blur?.();
            node.tabIndex = -1;
            node.style.pointerEvents = 'none';
            node.style.display = 'none';
            domEl.setVisible(false);
        } else {
            if (stash.ariaHidden == null) node.removeAttribute('aria-hidden');
            else node.setAttribute('aria-hidden', stash.ariaHidden);

            const isDisabled = node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true';
            if (isDisabled) {
                node.tabIndex = -1;
                node.style.pointerEvents = 'none';
            } else {
                node.tabIndex = stash.tabIndex ?? 0;
                node.style.pointerEvents = stash.pointerEvents || 'auto';
            }
            node.style.display = stash.display || '';
            domEl.setVisible(true);
        }
    }
}

/**
 * Create a focus trap for specified DOM overlay elements
 * @param elements Array of Phaser GameObjects that have buttonOverlay property
 * @param onEscape Optional callback when escape key is pressed
 * @returns Cleanup function to remove the focus trap
 */
export function createFocusTrap(
    elements: Phaser.GameObjects.GameObject[], 
    onEscape?: () => void
): () => void {
    const focusableElements: HTMLElement[] = [];
    
    // Extract focusable elements from the provided game objects
    for (const element of elements) {
        const overlay = (element as any)?.buttonOverlay;
        if (overlay && overlay.element && overlay.element instanceof HTMLElement) {
            focusableElements.push(overlay.element);
        }
    }
    
    if (focusableElements.length === 0) {
        console.warn('No focusable elements found for focus trap');
        return () => {};
    }
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && onEscape) {
            onEscape();
            return;
        }
        
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                // Shift + Tab (backward)
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab (forward)
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the first element initially
    firstElement.focus({ preventScroll: true });
    
    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
}