import { Enemy, Vector2, Playfield, Player } from '../../types';
import { generateCharacter } from './characterGenerator';
import { TILE_SIZE } from '../../components/GameView';
import { findValidSpawnPosition } from './playfieldGenerator';

const generateEnemy = (position: Vector2, mapKey: string, player: Player): Enemy => {
  const [mapX, mapY] = mapKey.split(',').map(Number);
  const dist = Math.max(0, Math.abs(mapX) + Math.abs(mapY));

  // Exponential scaling for health/damage.
  const distanceFactor = Math.pow(1.08, dist);
  // More aggressive exponential scaling for speed and detection range.
  const mobilityFactor = Math.pow(1.06, dist);

  // Factor in player power to ensure enemies keep up.
  const playerPower = player.stats.attack + player.stats.defense + (player.stats.maxHealth / 10);
  const initialPlayerPower = 10 + 5 + (100 / 10); // ATK + DEF + HP/10
  const playerFactor = Math.max(1, playerPower / initialPlayerPower);

  // Blend world difficulty and player power for scaling.
  const combatScaling = ((distanceFactor + playerFactor) / 2) * (0.9 + Math.random() * 0.2);
  const mobilityScaling = ((mobilityFactor + playerFactor) / 2) * (0.9 + Math.random() * 0.2);
  
  const baseStats = {
    maxHealth: 25 + Math.floor(Math.random() * 20),
    attack: 8 + Math.floor(Math.random() * 5),
    defense: 2 + Math.floor(Math.random() * 3),
    speed: 70 + Math.random() * 30, // Base speed
  };

  const stats = {
    maxHealth: Math.round(baseStats.maxHealth * combatScaling),
    attack: Math.round(baseStats.attack * combatScaling),
    defense: Math.round(baseStats.defense * combatScaling),
    speed: Math.round(baseStats.speed * mobilityScaling),
  };

  // FIX: Generate a character for the enemy before creating the enemy object.
  const character = generateCharacter();

  return {
    id: `enemy_${Date.now()}_${Math.random()}`,
    character,
    stats,
    currentHealth: stats.maxHealth,
    position,
    size: TILE_SIZE,
    detectionRange: Math.min(1200, 400 * mobilityFactor), // Cap detection range
  };
};

const generateBoss = (position: Vector2): Enemy => {
  const character = generateCharacter();
  character.sprite.bodyColor = '#a855f7'; // Make bosses purple
  const stats = {
    maxHealth: 150 + Math.floor(Math.random() * 50),
    attack: 20 + Math.floor(Math.random() * 10),
    defense: 8 + Math.floor(Math.random() * 5),
    speed: 60 + Math.random() * 30,
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

const generateRiftLord = (position: Vector2): Enemy => {
    const character = {
        id: 'char_RIFT_LORD',
        sprite: {
            bodyColor: '#be123c',
            eyeColor: '#fefce8',
            bodyShape: 'square' as const,
            eyeShape: 'square' as const,
        }
    };
    const stats = {
        maxHealth: 1000,
        attack: 40,
        defense: 20,
        speed: 90,
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

export const populateEnemies = (mapKey: string, worldWidth: number, worldHeight: number, playfield: Playfield, player: Player): Enemy[] => {
    const enemies: Enemy[] = [];

    if (mapKey === '10,10') {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateRiftLord(spawnPos));
        return enemies;
    }
    
    const [mapX, mapY] = mapKey.split(',').map(Number);
    const dist = Math.abs(mapX) + Math.abs(mapY);

    // Exponentially increase enemy count with distance, capped for performance.
    const enemyCountFactor = Math.pow(1.05, dist);
    let enemyCount = Math.min(30, Math.floor((8 + Math.random() * 5) * enemyCountFactor));

    // Boss chance increases with distance. Bosses spawn INSTEAD of regular enemies.
    const bossChance = 0.25 + Math.min(0.25, dist * 0.01); 
    if (dist > 2 && Math.random() < bossChance) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateBoss(spawnPos));
        enemyCount -= 4; // A boss is worth ~4 regular enemies
    }
    
    // Ensure enemyCount isn't negative after spawning a boss.
    enemyCount = Math.max(0, enemyCount);

    for (let i = 0; i < enemyCount; i++) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateEnemy(spawnPos, mapKey, player));
    }

    return enemies;
};
