import { Player, PlayerStats } from '../types';
import { generateCharacter } from './generators/characterGenerator';
import { MAP_WIDTH_TILES, MAP_HEIGHT_TILES, TILE_SIZE } from '../components/GameView';

const initialPlayerStats: PlayerStats = {
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 180,
};

export const generateInitialPlayer = (): Player => {
  const character = generateCharacter();
  return {
    id: `player_${Date.now()}`,
    character,
    stats: { ...initialPlayerStats },
    currentHealth: initialPlayerStats.maxHealth,
    position: { 
      x: (MAP_WIDTH_TILES * TILE_SIZE) / 2, 
      y: (MAP_HEIGHT_TILES * TILE_SIZE) / 2 
    },
    inventory: [],
  };
};