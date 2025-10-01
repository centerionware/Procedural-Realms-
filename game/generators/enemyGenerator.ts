import { Enemy, Vector2, Playfield } from '../../types';
import { generateCharacter } from './characterGenerator';
import { TILE_SIZE } from '../../components/GameView';
import { findValidSpawnPosition } from './playfieldGenerator';

const generateEnemy = (position: Vector2): Enemy => {
  const character = generateCharacter();
  const stats = {
    maxHealth: 20 + Math.floor(Math.random() * 30),
    attack: 8 + Math.floor(Math.random() * 7),
    defense: 1 + Math.floor(Math.random() * 5),
    speed: 60 + Math.random() * 90, // was 1 + Math.random() * 1.5
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

export const populateEnemies = (mapKey: string, worldWidth: number, worldHeight: number, playfield: Playfield): Enemy[] => {
    const enemies: Enemy[] = [];

    if (mapKey === '10,10') {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateRiftLord(spawnPos));
        return enemies;
    }

    const enemyCount = 10 + Math.floor(Math.random() * 8);

    for (let i = 0; i < enemyCount; i++) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateEnemy(spawnPos));
    }

    // 25% chance to spawn a boss in the room
    if (Math.random() < 0.25) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateBoss(spawnPos));
    }

    return enemies;
};