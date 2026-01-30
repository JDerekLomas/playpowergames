import { announceToScreenReader, i18n } from "@k8-games/sdk";

export class AnnouncementQueue {
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor() {
    }

    /**
     * Add a message to the announcement queue
     * @param message - The message to announce
     */
    queue(message: string) {
        // Prioritize feedback announcements by placing them at the front
        if (message.includes(i18n.t('common.correct')) || message.includes(i18n.t('common.incorrect'))) {
            this.announcementQueue.unshift(message);
        } else {
            this.announcementQueue.push(message);
        }
        this.processQueue();
    }

    /**
     * Process the announcement queue sequentially
     */
    private processQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) {
            return;
        }

        this.isAnnouncing = true;
        const message = this.announcementQueue.shift()!;

        announceToScreenReader(message);

        // Estimate the duration of the announcement and wait before processing next
        const words = message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds
        setTimeout(() => {
            this.isAnnouncing = false;
            this.processQueue();
        }, delay);
    }

    /**
     * Clear the announcement queue
     * @param keepCorrectIncorrect - Whether to keep correct/incorrect and streak announcements
     */
    clear(keepCorrectIncorrect: boolean = false) {
        if (keepCorrectIncorrect) {
            // Keep only correct/incorrect announcements and streak announcements
            this.announcementQueue = this.announcementQueue.filter(message =>
                message.includes(i18n.t('common.correct')) ||
                message.includes(i18n.t('common.incorrect')) ||
                message.includes('Progress bar: ') ||
                message.includes(' in a row')
            );
        } else {
            // Clear all announcements
            this.announcementQueue = [];
        }
    }

    /**
     * Get the current queue length
     */
    get length(): number {
        return this.announcementQueue.length;
    }

    /**
     * Check if currently announcing
     */
    get isProcessing(): boolean {
        return this.isAnnouncing;
    }
}
