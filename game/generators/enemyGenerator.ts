import { Enemy, Vector2, Playfield, Player } from '../../types';
import { generateCharacter } from './characterGenerator';
import { TILE_SIZE } from '../../components/GameView';
import { findValidSpawnPosition } from './playfieldGenerator';

const generateEnemy = (position: Vector2, mapKey: string, player: Player): Enemy => {
  const [mapX, mapY] = mapKey.split(',').map(Number);
  const dist = Math.abs(mapX) + Math.abs(mapY);

  // General distance factor for health/defense
  const distanceFactor = 1 + dist * 0.35;
  // More aggressive distance factor specifically for attack
  const attackDistanceFactor = 1 + dist * 0.6;

  // Player power is a measure of their current stats vs initial stats.
  const playerPower = player.stats.attack + player.stats.defense + (player.stats.maxHealth / 10);
  const initialPlayerPower = 10 + 5 + (100 / 10); // ATK + DEF + HP/10
  const playerFactor = Math.max(1, playerPower / initialPlayerPower);

  // Blend player and distance factors, capped by distance.
  const healthDefCombinedFactor = Math.min(distanceFactor, (distanceFactor + playerFactor) / 2);
  const attackCombinedFactor = Math.min(attackDistanceFactor, (attackDistanceFactor + playerFactor) / 2);

  // Add variance
  const finalHealthDefScaling = healthDefCombinedFactor * (0.9 + Math.random() * 0.2);
  const finalAttackScaling = attackCombinedFactor * (0.9 + Math.random() * 0.2);

  const character = generateCharacter();
  const stats = {
    maxHealth: Math.round((20 + Math.floor(Math.random() * 30)) * finalHealthDefScaling),
    attack: Math.round((8 + Math.floor(Math.random() * 7)) * finalAttackScaling),
    defense: Math.round((2 + Math.floor(Math.random() * 4)) * finalHealthDefScaling),
    speed: 60 + Math.random() * 90,
  };

  return {
    id: `enemy_${Date.now()}_${Math.random()}`,
    character,
    stats,
    currentHealth: stats.maxHealth,
    position,
    size: TILE_SIZE,
  };
};

const generateBoss = (position: Vector2): Enemy => {
  const character = generateCharacter();
  character.sprite.bodyColor = '#a855f7'; // Make bosses purple
  const stats = {
    maxHealth: 150 + Math.floor(Math.random() * 50),
    attack: 20 + Math.floor(Math.random() * 10),
    defense: 8 + Math.floor(Math.random() * 5),
    speed: 60 + Math.random() * 30, // was 1 + Math.random() * 0.5
  };

  return {
    id: `boss_${Date.now()}_${Math.random()}`,
    character,
    stats,
    currentHealth: stats.maxHealth,
    position,
    isBoss: true,
    size: TILE_SIZE * 1.8,
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
        speed: 90, // was 1.5
    };
    return {
        id: 'boss_RIFT_LORD',
        character,
        stats,
        currentHealth: stats.maxHealth,
        position,
        isBoss: true,
        size: TILE_SIZE * 2.5,
    };
}

export const populateEnemies = (mapKey: string, worldWidth: number, worldHeight: number, playfield: Playfield, player: Player): Enemy[] => {
    const enemies: Enemy[] = [];

    if (mapKey === '10,10') {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateRiftLord(spawnPos));
        return enemies;
    }

    const enemyCount = 10 + Math.floor(Math.random() * 8);

    for (let i = 0; i < enemyCount; i++) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateEnemy(spawnPos, mapKey, player));
    }

    // 25% chance to spawn a boss in the room
    if (Math.random() < 0.25) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateBoss(spawnPos));
    }

    return enemies;
};