import React from "react";
import styles from "@components/GameMechanicSelector/GameMechanicSelector.module.css";
import { Game } from "@/types/games";
import { i18n } from "@k8-games/sdk";

interface GameMechanicSelectorProps {
  game: Game;
  onSelect: (path: string) => void;
  onClose: () => void;
}

const GameMechanicSelector: React.FC<GameMechanicSelectorProps> = ({
  game,
  onSelect,
  onClose,
}) => {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        <h2 className={styles.title}>{`${i18n.t(`existingGamesData.${game.id}.title`)}`} | {i18n.t("gameMechanics")}</h2>
        <div className={styles.mechanicsList}>
          {game.mechanics?.map((mechanic) => (
            <button
              key={mechanic.id}
              className={styles.mechanicButton}
              onClick={() => onSelect(mechanic.path)}
            >
              <h3>{i18n.t(`existingGamesData.${game.id}.mechanics.${mechanic.id}.title`)}</h3>
              <p>{i18n.t(`existingGamesData.${game.id}.mechanics.${mechanic.id}.description`)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameMechanicSelector;
