import { Player, PlayerStats, Difficulty } from '../types';
import { generateCharacter } from './generators/characterGenerator';
import { MAP_WIDTH_TILES, MAP_HEIGHT_TILES, TILE_SIZE } from '../components/GameView';

const initialPlayerStats: PlayerStats = {
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 180,
};

export const generateInitialPlayer = (difficulty: Difficulty): Player => {
  const character = generateCharacter();
  const stats = { ...initialPlayerStats };

  if (difficulty === Difficulty.GOD_MODE) {
    stats.maxHealth = 1000;
    stats.attack = 100;
    stats.defense = 100;
    stats.speed = 300;
  }
  
  return {
    id: `player_${Date.now()}`,
    character,
    stats: { ...stats },
    currentHealth: stats.maxHealth,
    position: { 
      x: (MAP_WIDTH_TILES * TILE_SIZE) / 2, 
      y: (MAP_HEIGHT_TILES * TILE_SIZE) / 2 
    },
    inventory: [],
  };
};