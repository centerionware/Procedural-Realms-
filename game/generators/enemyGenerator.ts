
import { Enemy, Vector2, Playfield, Player } from '../../types';
import { generateCharacter } from './characterGenerator';
import { TILE_SIZE } from '../../components/GameView';
import { findValidSpawnPosition } from './playfieldGenerator';

const generateEnemy = (position: Vector2, mapKey: string, player: Player, clearFactor: number): Enemy => {
  const [mapX, mapY] = mapKey.split(',').map(Number);
  const dist = Math.max(0, Math.abs(mapX) + Math.abs(mapY));

  // Increased scaling factors for a steeper difficulty curve.
  const distanceFactor = Math.pow(1.18, dist);
  const mobilityFactor = Math.pow(1.10, dist);

  // The 'clearFactor' is now more impactful.
  const combatScaling = distanceFactor * clearFactor * (0.9 + Math.random() * 0.2);
  const mobilityScaling = mobilityFactor * (0.9 + Math.random() * 0.2);
  
  // Increased base stats to make early encounters more challenging.
  const baseStats = {
    maxHealth: 40 + Math.floor(Math.random() * 15),
    attack: 10 + Math.floor(Math.random() * 4),
    defense: 2 + Math.floor(Math.random() * 3),
    speed: 80 + Math.random() * 20,
  };

  const stats = {
    maxHealth: Math.max(20, Math.round(baseStats.maxHealth * combatScaling)),
    attack: Math.max(5, Math.round(baseStats.attack * combatScaling)),
    defense: Math.max(1, Math.round(baseStats.defense * combatScaling)),
    speed: Math.round(baseStats.speed * mobilityScaling),
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

const generateBoss = (position: Vector2): Enemy => {
  const character = generateCharacter();
  character.sprite.bodyColor = '#a855f7'; // Make bosses purple
  // Significantly increased boss stats to maintain their threat level.
  const stats = {
    maxHealth: 300 + Math.floor(Math.random() * 100),
    attack: 40 + Math.floor(Math.random() * 20),
    defense: 16 + Math.floor(Math.random() * 10),
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
    // Significantly increased final boss stats for an epic encounter.
    const stats = {
        maxHealth: 3000,
        attack: 80,
        defense: 40,
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

export const populateEnemies = (mapKey: string, worldWidth: number, worldHeight: number, playfield: Playfield, player: Player, clearCount: number): Enemy[] => {
    const enemies: Enemy[] = [];

    if (mapKey === '10,10') {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateRiftLord(spawnPos));
        return enemies;
    }
    
    const [mapX, mapY] = mapKey.split(',').map(Number);
    const dist = Math.abs(mapX) + Math.abs(mapY);

    // Increased scaling per clear to make farming a more strategic choice.
    const statClearFactor = Math.pow(1.3, clearCount); // 30% stat boost per clear
    const countClearFactor = Math.pow(1.3, clearCount); // 30% more enemies per clear

    // Increased enemy count scaling with distance.
    const enemyCountFactor = Math.pow(1.12, dist);
    // Slightly increased base enemy count.
    let enemyCount = Math.min(30, Math.floor(((6 + Math.random() * 4) * enemyCountFactor) * countClearFactor));

    const bossChance = 0.15 + Math.min(0.35, dist * 0.02);
    if (dist > 3 && Math.random() < bossChance) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateBoss(spawnPos));
        enemyCount -= 4; // A boss is worth ~4 regular enemies
    }
    
    // Ensure enemyCount isn't negative after spawning a boss.
    enemyCount = Math.max(0, enemyCount);

    for (let i = 0; i < enemyCount; i++) {
        const spawnPos = findValidSpawnPosition(playfield, worldWidth, worldHeight);
        enemies.push(generateEnemy(spawnPos, mapKey, player, statClearFactor));
    }

    return enemies;
};
