import { Item, ItemType, Weapon, Upgrade, PlayerStats, Vector2, Playfield } from '../../types';
import { findValidSpawnPosition } from './playfieldGenerator';

const WEAPON_PREFIXES = ['Ancient', 'Glowing', 'Cursed', 'Mighty', 'Swift', 'Jagged'];
const WEAPON_BASES = ['Sword', 'Axe', 'Dagger', 'Mace', 'Spear'];
const WEAPON_SUFFIXES = ['of Fire', 'of the Deep', 'of Swiftness', 'of Doom'];
const WEAPON_EFFECTS: Weapon['effect'][] = ['none', 'fire', 'ice'];

const UPGRADE_PREFIXES = ['Shard', 'Talisman', 'Idol', 'Relic'];
const UPGRADE_SUFFIXES = ['of Power', 'of Fortitude', 'of Agility', 'of Vigor'];
const STAT_KEYS: (keyof PlayerStats)[] = ['attack', 'defense', 'speed', 'maxHealth'];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateWeapon = (): Weapon => {
  const name = `${getRandomElement(WEAPON_PREFIXES)} ${getRandomElement(WEAPON_BASES)} ${getRandomElement(WEAPON_SUFFIXES)}`;
  const damage = 5 + Math.floor(Math.random() * 20);
  return {
    id: `item_${Date.now()}_${Math.random()}`,
    name,
    description: `A powerful weapon dealing ${damage} damage.`,
    type: ItemType.WEAPON,
    damage,
    effect: getRandomElement(WEAPON_EFFECTS),
  };
};

const generateUpgrade = (): Upgrade => {
  const name = `${getRandomElement(UPGRADE_PREFIXES)} ${getRandomElement(UPGRADE_SUFFIXES)}`;
  const statToBoost = getRandomElement(STAT_KEYS);
  
  let boostValue: number;
  if (statToBoost === 'speed') {
    boostValue = 30;
  } else if (statToBoost === 'maxHealth') {
    boostValue = 10 + Math.floor(Math.random() * 11); // 10-20
  } else { // attack or defense
    boostValue = 2 + Math.floor(Math.random() * 4); // 2-5
  }
  
  return {
    id: `item_${Date.now()}_${Math.random()}`,
    name,
    description: `Grants a permanent +${boostValue} to ${statToBoost}.`,
    type: ItemType.UPGRADE,
    statBoost: { [statToBoost]: boostValue },
  };
};

export const generateItem = (): Item => {
  if (Math.random() > 0.5) {
    return generateWeapon();
  } else {
    return generateUpgrade();
  }
};

const generateEasterEgg = (): Item => ({
  id: 'EASTER_EGG_DOT',
  name: 'Pixel of Origin',
  description: 'A tiny, shimmering dot. Feels important. Take it to 0,0.',
  type: ItemType.EASTER_EGG,
});

export const generateInitialItems = (mapKey: string, count: number, worldWidth: number, worldHeight: number, playfield: Playfield): ({ item: Item } & { position: Vector2 })[] => {
    const items = Array.from({ length: count }).map(() => ({
      item: generateItem(),
      position: findValidSpawnPosition(playfield, worldWidth, worldHeight),
    }));

    if (mapKey === '5,5') {
        items.push({
            item: generateEasterEgg(),
            position: findValidSpawnPosition(playfield, worldWidth, worldHeight),
        });
    }

    return items;
}