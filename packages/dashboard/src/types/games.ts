export interface GameMechanic {
  id: string;
  path: string;
}

export interface Game {
  id: string;
  image: string;
  path?: string;
  mechanics?: GameMechanic[];
  grade?: string;
  disabled?: boolean;
  scormUrl?: string;
  scormUrlEs?: string;
  title?: string;
  titleEs?: string;
  txTitle?: string;
  txTitleEs?: string;
  description?: string;
  descriptionEs?: string;
  lastUpdated?: string;
  gameName?: string;
}

export interface ScormDataEntry {
  gameName: string;
  image?: string;
  title?: string;
  titleEs?: string;
  txTitle?: string;
  txTitleEs?: string;
  description?: string;
  descriptionEs?: string;
  configs?: Record<string, string>;
  grade: string;
  disabled?: boolean;
  lastUpdated?: string;
}
