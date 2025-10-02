import { Item, ItemType, Weapon, Upgrade, PlayerStats, Vector2, Playfield, TileType } from '../../types';
import { TILE_SIZE } from '../../components/GameView';

const WEAPON_PREFIXES = ['Ancient', 'Glowing', 'Cursed', 'Mighty', 'Swift', 'Jagged'];
const WEAPON_BASES = ['Sword', 'Axe', 'Dagger', 'Mace', 'Spear'];
const WEAPON_SUFFIXES = ['of Fire', 'of the Deep', 'of Swiftness', 'of Doom'];
const WEAPON_EFFECTS: Weapon['effect'][] = ['none', 'fire', 'ice'];

const UPGRADE_PREFIXES = ['Shard', 'Talisman', 'Idol', 'Relic'];
const UPGRADE_SUFFIXES = ['of Power', 'of Fortitude', 'of Agility', 'of Vigor'];
const STAT_KEYS: (keyof PlayerStats)[] = ['attack', 'defense', 'speed', 'maxHealth'];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateWeapon = (isBossDrop?: boolean): Weapon => {
  const name = `${getRandomElement(WEAPON_PREFIXES)} ${getRandomElement(WEAPON_BASES)} ${getRandomElement(WEAPON_SUFFIXES)}`;
  const damageBonus = isBossDrop ? 10 : 0;
  const damage = 5 + damageBonus + Math.floor(Math.random() * 20);
  return {
    id: `item_${Date.now()}_${Math.random()}`,
    name,
    description: `A powerful weapon dealing ${damage} damage.`,
    type: ItemType.WEAPON,
    damage,
    effect: getRandomElement(WEAPON_EFFECTS),
  };
};

const generateUpgrade = (isBossDrop?: boolean): Upgrade => {
  const name = `${getRandomElement(UPGRADE_PREFIXES)} ${getRandomElement(UPGRADE_SUFFIXES)}`;
  const statToBoost = getRandomElement(STAT_KEYS);
  
  const bossMultiplier = isBossDrop ? 1.5 : 1;
  let boostValue: number;

  if (statToBoost === 'speed') {
    boostValue = Math.round(30 * bossMultiplier);
  } else if (statToBoost === 'maxHealth') {
    boostValue = Math.round((10 + Math.floor(Math.random() * 11)) * bossMultiplier); // 10-20
  } else { // attack or defense
    boostValue = Math.round((2 + Math.floor(Math.random() * 4)) * bossMultiplier); // 2-5
  }
  
  return {
    id: `item_${Date.now()}_${Math.random()}`,
    name,
    description: `Grants a permanent +${boostValue} to ${statToBoost}.`,
    type: ItemType.UPGRADE,
    statBoost: { [statToBoost]: boostValue },
  };
};

export const generateItem = (isBossDrop?: boolean): Item => {
  if (Math.random() > 0.5) {
    return generateWeapon(isBossDrop);
  } else {
    return generateUpgrade(isBossDrop);
  }
};

export const generateEasterEgg = (): Item => ({
  id: 'EASTER_EGG_DOT',
  name: 'Pixel of Origin',
  description: 'A tiny, shimmering dot. Feels important. Take it to 0,0.',
  type: ItemType.EASTER_EGG,
});

const generateGlitchedItem = (): Item => ({
    id: 'GLITCHED_ITEM_CONTAINER',
    name: 'Anomalous Fragment',
    description: 'A flickering, unstable piece of reality. It feels... wrong.',
    type: ItemType.GLITCHED_ITEM_CONTAINER,
});

export const generateInitialItems = (mapKey: string, count: number, worldWidth: number, worldHeight: number, playfield: Playfield, easterEggMapKey: string): ({ item: Item } & { position: Vector2 })[] => {
    const validTiles: Vector2[] = [];
    playfield.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === TileType.FLOOR) {
                validTiles.push({ x, y });
            }
        });
    });

    // Fisher-Yates shuffle to randomize spawn points
    for (let i = validTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]];
    }
    
    const itemsToSpawn = Math.min(count, validTiles.length);
    const items = Array.from({ length: itemsToSpawn }).map((_, i) => {
        const tile = validTiles[i];
        const position = {
            x: tile.x * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
            y: tile.y * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
        };
        return { item: generateItem(), position };
    });

    if (mapKey === easterEggMapKey && validTiles.length > itemsToSpawn) {
        const tile = validTiles[itemsToSpawn];
        const position = {
             x: tile.x * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
             y: tile.y * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
        };
        items.push({
            item: generateGlitchedItem(),
            position,
        });
    }

    return items;
}
