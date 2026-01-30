export function announceToScreenReader(message: string, ariaLive?: 'off' | 'polite' | 'assertive') {
    const announcer = document.getElementById('aria-announcer');
    if (announcer) {
        if (ariaLive) {
            announcer.setAttribute('aria-live', ariaLive);
            setTimeout(() => {
                announcer.setAttribute('aria-live', 'assertive');
            }, 1000);
        }
        announcer.textContent = '';
        setTimeout(() => {
            announcer.textContent = message;
        }, 100);
    }
}

export function focusToGameContainer() {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        const ariaLabel = gameContainer.getAttribute('aria-label') || '';
        gameContainer.setAttribute('aria-label', '')
        
        // Move focus to game container
        gameContainer.focus();

        setTimeout(() => {
            gameContainer.setAttribute('aria-label', ariaLabel);
        }, 1000);
    }
}