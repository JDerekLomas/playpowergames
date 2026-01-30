import React, { useState } from "react";
import GameCard from "@components/GameCard";
import GameMechanicSelector from "@components/GameMechanicSelector";
import styles from "@components/GamesGrid/GamesGrid.module.css";
import { Game } from "@/types/games";
import { useLanguage } from "@/contexts/LanguageContext";

interface GamesGridProps {
  games: Game[];
  onGameClick: (path: string) => void;
  isExistingGame?: boolean;
  hideDetails?: boolean;
}

const GamesGrid: React.FC<GamesGridProps> = ({
  games,
  onGameClick,
  isExistingGame = false,
  hideDetails = false,
}) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const { currentLang } = useLanguage();

  const handleGameClick = (game: Game) => {
    if (isExistingGame) {
      setSelectedGame(game);
    } else if (game.path) {
      onGameClick(game.path);
    }
  };

  const handleMechanicSelect = (path: string) => {
    window.open(path, "_blank");
    setSelectedGame(null);
  };

  return (
    <>
      <div className={styles.grid}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            grade={game.grade || "K"}
            image={game.image}
            onClick={() => handleGameClick(game)}
            disabled={game.disabled}
            path={game.path}
            isExistingGame={isExistingGame}
            hideDetails={hideDetails}
            scormUrl={game.scormUrl}
            scormUrlEs={game.scormUrlEs}
            title={game.title}
            titleEs={game.titleEs}
            txTitle={game.txTitle}
            txTitleEs={game.txTitleEs}
            description={currentLang === 'es' ? game.descriptionEs : game.description}
            lastUpdated={game.lastUpdated}
          />
        ))}
      </div>

      {selectedGame && (
        <GameMechanicSelector
          game={selectedGame}
          onSelect={handleMechanicSelect}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  );
};

export default GamesGrid;
