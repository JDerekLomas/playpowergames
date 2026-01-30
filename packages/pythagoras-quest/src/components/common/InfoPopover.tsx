import React, { useEffect, useRef } from "react";
import { useTranslations } from "../../hooks/useTranslations";

interface InfoPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    heading: string;
    position: { x: number; y: number };
    triggerRef: React.RefObject<HTMLElement | null>;
}

const InfoPopover: React.FC<InfoPopoverProps> = ({
    isOpen,
    onClose,
    content,
    heading,
    position,
    triggerRef,
}) => {
    const { t } = useTranslations();
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm"
            style={{
                left: position.x,
                top: position.y,
                transform: "translate(-50%, 10px)",
            }}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                    {heading}
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    aria-label={t("common.closeInfoPopoverAria")}
                >
                    ×
                </button>
            </div>
            <div
                className="text-sm text-gray-600"
                dangerouslySetInnerHTML={{ __html: content }}
            />
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
        </div>
    );
};

export default InfoPopover;
