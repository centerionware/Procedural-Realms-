import { Enemy, Vector2, Playfield, Player, Difficulty } from '../../types';
import { generateCharacter } from './characterGenerator';
import { TILE_SIZE } from '../../components/GameView';
import { findValidSpawnPosition } from './playfieldGenerator';

const difficultyMultipliers = {
  [Difficulty.EASY]:       { health: 0.25, attack: 0.15, defense: 0.3, speed: 0.8, count: 0.7 },
  [Difficulty.MEDIUM]:     { health: 0.5, attack: 0.33, defense: 0.5, speed: 1.0, count: 1.0 },
  [Difficulty.HARD]:       { health: 0.75, attack: 0.6, defense: 0.75, speed: 1.1, count: 1.2 },
  [Difficulty.IMPOSSIBLE]: { health: 1.0, attack: 1.0, defense: 1.0, speed: 1.2, count: 1.5 },
  [Difficulty.GOD_MODE]:   { health: 0.1, attack: 0.05, defense: 0.1, speed: 0.7, count: 0.5 },
};

const generateEnemy = (position: Vector2, mapKey: string, player: Player, clearFactor: number, difficulty: Difficulty): Enemy => {
  const [mapX, mapY] = mapKey.split(',').map(Number);
  const dist = Math.max(0, Math.abs(mapX) + Math.abs(mapY));

  const distanceFactor = Math.pow(1.18, dist);
  const mobilityFactor = Math.pow(1.10, dist);

  const combatScaling = distanceFactor * clearFactor * (0.9 + Math.random() * 0.2);
  const mobilityScaling = mobilityFactor * (0.9 + Math.random() * 0.2);
  
  const baseStats = {
    maxHealth: (40 + Math.floor(Math.random() * 15)) * 3,
    attack: (10 + Math.floor(Math.random() * 4)),
    defense: (2 + Math.floor(Math.random() * 3)) * 3,
    speed: 80 + Math.random() * 20,
  };

  const multipliers = difficultyMultipliers[difficulty];
  const stats = {
    maxHealth: Math.max(20, Math.round(baseStats.maxHealth * combatScaling * multipliers.health)),
    attack: Math.max(1, Math.round(baseStats.attack * combatScaling * multipliers.attack)),
    defense: Math.max(1, Math.round(baseStats.defense * combatScaling * multipliers.defense)),
    speed: Math.round(baseStats.speed * mobilityScaling * multipliers.speed),
  };

  const character = generateCharacter();

  return {
    id: `enemy_${Date.now()}_${Math.random()}`,
    character,
    stats,
    currentHealth: stats.maxHealth,
    position,
    size: TILE_SIZE,
    detectionRange: Math.min(1200, 400 * mobilityFactor),
  };
};

const generateBoss = (position: Vector2, difficulty: Difficulty): Enemy => {
  const character = generateCharacter();
  character.sprite.bodyColor = '#a855f7';
  
  const baseStats = {
    maxHealth: (300 + Math.floor(Math.random() * 100)) * 3,
    attack: (40 + Math.floor(Math.random() * 20)),
    defense: (16 + Math.floor(Math.random() * 10)) * 3,
    speed: 60 + Math.random() * 30,
  };

  const multipliers = difficultyMultipliers[difficulty];
  const stats = {
    maxHealth: Math.max(100, Math.round(baseStats.maxHealth * multipliers.health)),
    attack: Math.max(5, Math.round(baseStats.attack * multipliers.attack)),
    defense: Math.max(5, Math.round(baseStats.defense * multipliers.defense)),
    speed: Math.round(baseStats.speed * multipliers.speed),
  };

  return {
    id: `boss_${Date.now()}_${Math.random()}`,
    character,
    stats,
    currentHealth: stats.maxHealth,
    position,
    isBoss: true,
    size: TILE_SIZE * 1.8,
    detectionRange: 600,
  };
};

const generateRiftLord = (position: Vector2, difficulty: Difficulty): Enemy => {
    const character = {
        id: 'char_RIFT_LORD',
        sprite: {
            bodyColor: '#be123c',
            eyeColor: '#fefce8',
            bodyShape: 'square' as const,
            eyeShape: 'square' as const,
        }
    };
    
    const baseStats = {
        maxHealth: 9000,
        attack: 80,
        defense: 120,
        speed: 90,
    };

    const multipliers = difficultyMultipliers[difficulty];
    const stats = {
      maxHealth: Math.max(500, Math.round(baseStats.maxHealth * multipliers.health)),
      attack: Math.max(10, Math.round(baseStats.attack * multipliers.attack)),
      defense: Math.max(10, Math.round(baseStats.defense * multipliers.defense)),
      speed: Math.round(baseStats.speed * multipliers.speed),
    };

    return {
        id: 'boss_RIFT_LORD',
        character,
        stats,
        currentHealth: stats.maxHealth,
        position,
        isBoss: true,
        size: TILE_SIZE * 2.5,
        detectionRange: 1200,
    };
}

export const populateEnemies = (mapKey: string, worldWidth: number, worldHeight: number, playfield: Playfield, player: Player, clearCount: number, difficulty: Difficulty): Enemy[] => {
    const enemies: Enemy[] = [];

    if (mapKey === '10,10') {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateRiftLord(spawnPos, difficulty));
        return enemies;
    }
    
    const [mapX, mapY] = mapKey.split(',').map(Number);
    const dist = Math.abs(mapX) + Math.abs(mapY);

    const statClearFactor = Math.pow(1.3, clearCount);
    const countClearFactor = Math.pow(1.3, clearCount);

    const enemyCountFactor = Math.pow(1.12, dist);
    
    const multipliers = difficultyMultipliers[difficulty];
    let enemyCount = Math.min(30, Math.floor(((6 + Math.random() * 4) * enemyCountFactor) * countClearFactor * multipliers.count));

    const bossChance = 0.15 + Math.min(0.35, dist * 0.02);
    if (dist > 3 && Math.random() < bossChance) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateBoss(spawnPos, difficulty));
        enemyCount -= 4;
    }
    
    enemyCount = Math.max(0, enemyCount);

    for (let i = 0; i < enemyCount; i++) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateEnemy(spawnPos, mapKey, player, statClearFactor, difficulty));
    }

    return enemies;
};