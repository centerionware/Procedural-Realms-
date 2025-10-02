export enum GameState {
  MAIN_MENU,
  IN_GAME,
  GAME_OVER,
  GAME_WON,
  SHOW_CREDITS,
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerStats {
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Player {
  id: string;
  character: Character;
  stats: PlayerStats;
  currentHealth: number;
  position: Vector2;
  inventory: Item[];
  equippedWeapon?: Weapon;
}

export interface Enemy {
  id: string;
  character: Character;
  stats: PlayerStats;
  currentHealth: number;
  position: Vector2;
  isBoss?: boolean;
  size: number;
  detectionRange?: number;
}

export interface Character {
  id: string;
  sprite: CharacterSpriteData;
}

export interface CharacterSpriteData {
  bodyColor: string;
  eyeColor: string;
  bodyShape: 'circle' | 'square';
  eyeShape: 'circle' | 'square';
}

export enum ItemType {
  WEAPON,
  UPGRADE,
  EASTER_EGG,
  GLITCHED_ITEM_CONTAINER,
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
}

export interface Weapon extends Item {
  type: ItemType.WEAPON;
  damage: number;
  effect: 'none' | 'fire' | 'ice';
}

export interface Upgrade extends Item {
  type: ItemType.UPGRADE;
  statBoost: Partial<PlayerStats>;
}

export enum TileType {
  FLOOR,
  WALL,
  TREASURE,
  EXIT,
}

export type Playfield = TileType[][];

export interface DamageNumber {
  id: string;
  text: string;
  position: Vector2;
  timestamp: number;
  color: string;
}

export interface MapColors {
  floor: string;
  wall: string;
}

export interface WorldMap {
  playfield: Playfield;
  items: ({ item: Item } & { position: Vector2 })[];
  enemies: Enemy[];
  colors: MapColors;
  clearCount: number;
}
