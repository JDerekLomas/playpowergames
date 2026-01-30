import React, { useEffect, useRef } from "react";
import { useTranslations } from "../../hooks/useTranslations";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    type: "help" | "info";
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    content,
    type,
}) => {
    const { t } = useTranslations();
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Focus trap: keep focus within modal
    useEffect(() => {
        if (!isOpen) return;

        const modalElement = modalRef.current;
        if (!modalElement) return;

        // Focus the close button when modal opens
        closeButtonRef.current?.focus();

        // Get all focusable elements within the modal
        const getFocusableElements = () => {
            return modalElement.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = Array.from(getFocusableElements());
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab: moving backwards
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement?.focus();
                    }
                } else {
                    // Tab: moving forwards
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement?.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Set inert on background content
        const interactiveScene = document.querySelector('.interactive-split-container');
        const audioControls = document.querySelector('.audio-controls');
        
        if (interactiveScene) {
            (interactiveScene as HTMLElement).inert = true;
        }
        if (audioControls) {
            (audioControls as HTMLElement).inert = true;
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            
            // Remove inert when modal closes
            if (interactiveScene) {
                (interactiveScene as HTMLElement).inert = false;
            }
            if (audioControls) {
                (audioControls as HTMLElement).inert = false;
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`modal-content modal-${type}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">{title}</h2>
                    <button
                        ref={closeButtonRef}
                        className="modal-close"
                        onClick={onClose}
                        aria-label={t("common.closeAria")}
                    >
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            </div>
        </div>
    );
};
