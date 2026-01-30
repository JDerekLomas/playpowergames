import { Game, ScormDataEntry } from "@/types/games";

let PPL_GAMES_URL: string;

if (window.location.hostname === "localhost") {
  PPL_GAMES_URL = "https://games-stage.playpower.ai";
} else {
  PPL_GAMES_URL = `https://${window.location.hostname}`;
}

// Helper function to create a new game entry from scorm data
const createGameFromScormData = (id: string, data: ScormDataEntry): Game => {
  const baseGame: Game = {
    id,
    image: data.image || `./assets/images/${data.gameName}.png`,
    grade: data.grade || "K",
    gameName: data.gameName,
    title: data.title,
    titleEs: data.titleEs,
    txTitle: data.txTitle,
    txTitleEs: data.txTitleEs,
    description: data.description,
    descriptionEs: data.descriptionEs,
    disabled: data.disabled || false,
    lastUpdated: data.lastUpdated,
  };

  // If the game has a specific gameName, try to construct the path
  if (data.gameName) {
    baseGame.path = `${PPL_GAMES_URL}/${data.gameName}/index.html`;

    // Add query parameters if configs exist
    if (data.configs) {
      const params = new URLSearchParams();
      Object.entries(data.configs).forEach(([key, value]) => {
        params.append(key, value);
      });
      baseGame.path += `?${params.toString()}`;
    }

    // Set scorm URL
    baseGame.scormUrl = `${PPL_GAMES_URL}/${data.gameName}/scorm/${id}_en.zip`;
    baseGame.scormUrlEs = `${PPL_GAMES_URL}/${data.gameName}/scorm/${id}_es.zip`;
  }

  return baseGame;
};

// Helper function to process scorm data and update games array
export const processScormData = (games: Game[], scormData: Record<string, ScormDataEntry>): Game[] => {
  Object.entries(scormData).forEach(([id, data]) => {
    const existingGameIndex = games.findIndex(game => game.id === id);

    if (existingGameIndex !== -1) {
      // Entry exists - update it      
      games[existingGameIndex] = createGameFromScormData(id, data);
    } else {
      // Entry doesn't exist - create a new one
      games.push(createGameFromScormData(id, data));
    }
  });

  return games;
};

// Export the PPL_GAMES_URL for use in other files
export { PPL_GAMES_URL };
