import React from 'react';
import { Button } from '../ui/button';
import styles from '@components/GameCard/GameCard.module.css';
import { Download as DownloadIcon } from 'lucide-react';
import { i18n } from '@k8-games/sdk';
import { useLanguage } from '@/contexts/LanguageContext';

const Download = DownloadIcon as any;

interface GameCardProps {
    id: string;
    grade: string;
    image: string;
    onClick: () => void;
    disabled?: boolean;
    path?: string;
    isExistingGame?: boolean;
    hideDetails?: boolean;
    scormUrl?: string;
    scormUrlEs?: string;
    title?: string;
    titleEs?: string;
    txTitle?: string;
    txTitleEs?: string;
    description?: string;
    lastUpdated?: string;
}

const GameCard: React.FC<GameCardProps> = ({
    id,
    grade,
    image,
    onClick,
    disabled = false,
    path,
    isExistingGame = false,
    hideDetails = false,
    scormUrl,
    scormUrlEs,
    title,
    titleEs,
    txTitle,
    txTitleEs,
    description,
    lastUpdated,
}) => {
    const { currentLang } = useLanguage();
    const imageUrl = isExistingGame ? image.replace('.png', '-en.png') : image.replace('.png', `-${currentLang}.png`);

    // Get the appropriate titles based on language
    const displayTitle = currentLang === 'es' ? titleEs : title;
    const displayTxTitle = currentLang === 'es' ? txTitleEs : txTitle;

    const handlePlayClick = () => {
        if (isExistingGame) {
            onClick();
        } else {
            const url = new URL(path!);
            url.searchParams.set('lang', currentLang || 'en');
            window.open(url.toString(), '_blank');
        }
    };

    const handleDownloadClick = () => {
        if (scormUrl && scormUrlEs) {
            const link = document.createElement('a');
            link.href = currentLang === 'es' ? scormUrlEs : scormUrl;
            link.download = `${i18n.t(`title.grade${grade}.${id}`).replace(/[^a-zA-Z0-9]/g, '_')}_SCORM_${currentLang}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const formatLastUpdated = (value?: string): string | null => {
        if (!value) return null;
        // Normalize to ISO with time if legacy date-only
        const iso = value.length <= 10 ? `${value}T00:00:00Z` : value;
        const updated = new Date(iso);
        if (isNaN(updated.getTime())) return null;

        const now = new Date();
        // Compare using UTC date components
        const sameUtcDay =
            now.getUTCFullYear() === updated.getUTCFullYear() &&
            now.getUTCMonth() === updated.getUTCMonth() &&
            now.getUTCDate() === updated.getUTCDate();

        if (sameUtcDay) {
            const diffMs = Math.max(0, now.getTime() - updated.getTime());
            const minutes = Math.floor(diffMs / (1000 * 60));
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
            const hours = Math.floor(minutes / 60);
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        }
        // Not same UTC day: prefer relative days/weeks/months; fallback to UTC date for 12+ months
        const nowMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const updMid = Date.UTC(updated.getUTCFullYear(), updated.getUTCMonth(), updated.getUTCDate());
        const diffDays = Math.max(0, Math.floor((nowMid - updMid) / (1000 * 60 * 60 * 24)));

        if (diffDays < 7) {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
        if (diffDays < 30) {
            const weeks = Math.ceil(diffDays / 7);
            return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
        }
        const months = (() => {
            let m = (now.getUTCFullYear() - updated.getUTCFullYear()) * 12 + (now.getUTCMonth() - updated.getUTCMonth());
            if (now.getUTCDate() < updated.getUTCDate()) m -= 1;
            return Math.max(0, m);
        })();
        if (months >= 1 && months < 12) {
            return `${months} month${months === 1 ? '' : 's'} ago`;
        }
        // Fallback: Show UTC date YYYY-MM-DD for 12+ months
        return updated.toISOString().slice(0, 10);
    };

    const displayLastUpdated = formatLastUpdated(lastUpdated);

    return (
        <div className={`${styles.gameCard} ${disabled ? styles.disabledCard : ''}`} aria-disabled={disabled}>
            <div className={
                isExistingGame
                ? `${styles.gameImageWrapper} ${styles.existingGameImageWrapper}`
                : styles.gameImageWrapper
            }>
                <img
                    src={imageUrl}
                    alt={isExistingGame ? i18n.t(`existingGamesData.${id}.title`) : i18n.t(`title.grade${grade}.${id}`)}
                    className={isExistingGame ? styles.existingGameImage : styles.gameImage}
                />
            </div>
            <div className={styles.gameContent}>
                {isExistingGame ? (
                    <>
                        {!hideDetails && (
                            <>
                                <h3 className={styles.gameTitle}>{i18n.t(`existingGamesData.${id}.title`)}</h3>
                                <p className={styles.gameDescription}>{i18n.t(`existingGamesData.${id}.description`)}</p>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {!hideDetails && (
                            <>
                                <h3 className={styles.gameTitle}>{displayTitle}</h3>
                                {displayTxTitle && (
                                    <p className={styles.txTitle}>{displayTxTitle}</p>
                                )}
                                <p className={styles.gameDescription}>{description}</p>
                            </>
                        )}
                        {displayLastUpdated && (
                            <p className={styles.lastUpdated}>Last updated: {displayLastUpdated}</p>
                        )}
                    </>
                )}
                <div className={styles.gameFooter}>
                    {!disabled && (
                        <>
                            <Button
                                variant='default'
                                className={`${styles.playButton} w-[120px]`}
                                onClick={handlePlayClick}
                            >
                                {i18n.t('playNow')}
                            </Button>
                            {scormUrl && (
                                <Button
                                    variant='outline'
                                    className={`${styles.downloadButton} px-3 flex items-center justify-center`}
                                    onClick={handleDownloadClick}
                                    title='Download SCORM Package'
                                >
                                    <Download size={16} />
                                </Button>
                            )}
                        </>
                    )}
                    {disabled && <span className={styles.playText}>{i18n.t('comingSoon')}</span>}
                </div>
            </div>
        </div>
    );
};

export default GameCard;
