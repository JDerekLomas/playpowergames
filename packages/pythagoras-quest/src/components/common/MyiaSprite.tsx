import React from "react";
import { useTranslations } from "../../hooks/useTranslations";

export type MyiaAnimationType = "idle" | "walking";

interface MyiaSpriteProps {
    className?: string;
    style?: React.CSSProperties;
    animation?: MyiaAnimationType;
    flipped?: boolean;
}

export const MyiaSprite: React.FC<MyiaSpriteProps> = ({
    className = "",
    style = {},
    animation = "idle",
    flipped = false,
}) => {
    const { t } = useTranslations();
    const spriteClassName = `myia-sprite ${animation} ${
        flipped ? "flipped" : ""
    } ${className}`.trim();

    return (
        <img
            src="assets/myia.png"
            alt={t("common.myiaAlt")}
            className={spriteClassName}
            style={style}
        />
    );
};
