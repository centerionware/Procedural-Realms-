import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, Item, Enemy, Vector2, ItemType, Weapon, Upgrade, PlayerStats, DamageNumber, WorldMap, Playfield, TileType } from '../types';
import { generateInitialPlayer } from '../game/player';
import { generatePlayfield } from '../game/generators/playfieldGenerator';
import { generateInitialItems, generateItem } from '../game/generators/itemGenerator';
import { populateEnemies } from '../game/generators/enemyGenerator';
import useGameLoop from '../hooks/useGameLoop';
import usePlayerInput from '../hooks/usePlayerInput';
import GameUI from './GameUI';
import PlayfieldView from './PlayfieldView';

export const TILE_SIZE = 40;
export const PLAYER_SIZE = 40;
export const MAP_WIDTH_TILES = 50;
export const MAP_HEIGHT_TILES = 50;

const getDistance = (pos1: Vector2, pos2: Vector2) => {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
};

const isColliding = (pos: Vector2, playfield: Playfield): boolean => {
  const collisionPoints = [
    { x: pos.x + 2, y: pos.y + 2 }, // Top-left inset
    { x: pos.x + PLAYER_SIZE - 2, y: pos.y + 2 }, // Top-right inset
    { x: pos.x + 2, y: pos.y + PLAYER_SIZE - 2 }, // Bottom-left inset
    { x: pos.x + PLAYER_SIZE - 2, y: pos.y + PLAYER_SIZE - 2 }, // Bottom-right inset
  ];

  for (const point of collisionPoints) {
    const tileX = Math.floor(point.x / TILE_SIZE);
    const tileY = Math.floor(point.y / TILE_SIZE);

    if (
      tileY < 0 || tileY >= playfield.length ||
      tileX < 0 || tileX >= playfield[0].length
    ) {
      // Position is off the map, which is handled by map transition logic, not collision.
      return false;
    }

    const tile = playfield[tileY][tileX];
    if (tile === TileType.WALL) {
      return true;
    }
  }
  return false;
};

interface GameViewProps {
  onExit: () => void;
  onGameOver: () => void;
  onGameWon: () => void;
  onShowCredits: () => void;
}

const GameView: React.FC<GameViewProps> = ({ onExit, onGameOver, onGameWon, onShowCredits }) => {
  const [player, _setPlayer] = useState<Player>(() => generateInitialPlayer());
  const playerRef = useRef(player);
  const setPlayer: React.Dispatch<React.SetStateAction<Player>> = useCallback((action) => {
    _setPlayer(currentPlayer => {
        const newState = typeof action === 'function' ? (action as (prevState: Player) => Player)(currentPlayer) : action;
        playerRef.current = newState;
        return newState;
    });
  }, []);

  const [world, setWorld] = useState<Map<string, WorldMap>>(new Map());
  const [currentMapKey, setCurrentMapKey] = useState('0,0');
  
  const [messages, setMessages] = useState<string[]>([
    'A rift has opened! A powerful being threatens the realms.',
    'You must travel to coordinates 10,10 and defeat the Rift Lord!',
    'Welcome to the Procedural Realms!',
  ]);
  const { direction: keyboardDirection } = usePlayerInput();
  
  const [screenShake, setScreenShake] = useState(0);
  const [hitEffects, setHitEffects] = useState<{ [id: string]: number }>({});
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [moveTarget, setMoveTarget] = useState<Vector2 | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const lastCombatTimeRef = useRef<{ [enemyId: string]: number }>({});
  const pickedUpItemIds = useRef(new Set<string>());

  const currentMapData = world.get(currentMapKey);

  useEffect(() => {
    if (!world.has(currentMapKey)) {
      const { playfield: newPlayfield, colors: newColors } = generatePlayfield(MAP_WIDTH_TILES, MAP_HEIGHT_TILES, currentMapKey);
      const newItems = generateInitialItems(currentMapKey, 20, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, newPlayfield);
      const newEnemies = populateEnemies(currentMapKey, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, newPlayfield);
      
      const newMapData: WorldMap = {
        playfield: newPlayfield,
        items: newItems,
        enemies: newEnemies,
        colors: newColors,
      };

      setWorld(prevWorld => new Map(prevWorld).set(currentMapKey, newMapData));
    } else {
        const existingMap = world.get(currentMapKey)!;
        if (existingMap.enemies.length === 0 && currentMapKey !== '10,10' && currentMapKey !== '0,0') {
             const newEnemies = populateEnemies(currentMapKey, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, existingMap.playfield);
             existingMap.enemies = newEnemies;
             setWorld(prevWorld => new Map(prevWorld).set(currentMapKey, existingMap));
        }
    }
  }, [currentMapKey, world]);
  
  const addMessage = useCallback((message: string) => {
    setMessages(prev => [...prev.slice(-10), message]);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsPointerDown(true);
    updateMoveTarget(event);
  };
  
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPointerDown) {
      updateMoveTarget(event);
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
  };

  const updateMoveTarget = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gameContainerRef.current || !currentMapData) return;
    const rect = gameContainerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const worldX = playerRef.current.position.x + (clickX - rect.width / 2);
    const worldY = playerRef.current.position.y + (clickY - rect.height / 2);
    setMoveTarget({ x: worldX, y: worldY });
  };


  const updateGame = (deltaTime: number) => {
    if (!currentMapData) return;
    const now = Date.now();
    // Cap delta time to prevent massive jumps on lag spikes or tab focus
    const dt = Math.min(deltaTime, 1 / 30);
    
    const hasDot = player.inventory.some(item => item.type === ItemType.EASTER_EGG);
    if (hasDot && currentMapKey === '0,0') {
      onShowCredits();
      return;
    }
    
    setScreenShake(s => Math.max(0, s - 1));
    setDamageNumbers(d => d.filter(dn => now - dn.timestamp < 1000));

    let finalDirection = keyboardDirection;
    if ((keyboardDirection.x !== 0 || keyboardDirection.y !== 0) && moveTarget) {
      setMoveTarget(null);
    }
    
    if (moveTarget && keyboardDirection.x === 0 && keyboardDirection.y === 0) {
      const dx = moveTarget.x - player.position.x;
      const dy = moveTarget.y - player.position.y;
      const distance = getDistance(player.position, moveTarget);

      if (distance < player.stats.speed * dt) {
        setMoveTarget(null);
        finalDirection = { x: 0, y: 0 };
      } else {
        finalDirection = { x: dx / distance, y: dy / distance };
      }
    }

    setPlayer(p => {
      if (p.currentHealth <= 0) {
        onGameOver();
        return p;
      }
      
      let newPos = { ...p.position };
      const deltaX = finalDirection.x * p.stats.speed * dt;
      const deltaY = finalDirection.y * p.stats.speed * dt;
      
      const tempPosX = { ...newPos, x: newPos.x + deltaX };
      if (!isColliding(tempPosX, currentMapData.playfield)) {
        newPos.x += deltaX;
      }

      const tempPosY = { ...newPos, y: newPos.y + deltaY };
      if (!isColliding(tempPosY, currentMapData.playfield)) {
        newPos.y += deltaY;
      }

      const worldWidth = currentMapData.playfield[0].length * TILE_SIZE;
      const worldHeight = currentMapData.playfield.length * TILE_SIZE;
      const [mapX, mapY] = currentMapKey.split(',').map(Number);
      
      let mapChanged = false;
      const spawnMargin = TILE_SIZE * 2;

      if (newPos.x > worldWidth - PLAYER_SIZE) {
        setCurrentMapKey(`${mapX + 1},${mapY}`);
        newPos = { x: spawnMargin, y: newPos.y };
        mapChanged = true;
      } else if (newPos.x < 0) {
        setCurrentMapKey(`${mapX - 1},${mapY}`);
        newPos = { x: worldWidth - PLAYER_SIZE - spawnMargin, y: newPos.y };
        mapChanged = true;
      } else if (newPos.y > worldHeight - PLAYER_SIZE) {
        setCurrentMapKey(`${mapX},${mapY + 1}`);
        newPos = { x: newPos.x, y: spawnMargin };
        mapChanged = true;
      } else if (newPos.y < 0) {
        setCurrentMapKey(`${mapX},${mapY - 1}`);
        newPos = { x: newPos.x, y: worldHeight - PLAYER_SIZE - spawnMargin };
        mapChanged = true;
      }
      
      if(mapChanged) {
        setMoveTarget(null);
        pickedUpItemIds.current.clear();
      }
      
      return { ...p, position: newPos };
    });

    let updatedEnemies = currentMapData.enemies.map(enemy => {
      const distanceToPlayer = getDistance(enemy.position, player.position);
      let newEnemy = { ...enemy };

      if (distanceToPlayer < 400 && distanceToPlayer > enemy.size * 0.8) {
        const dx = player.position.x - enemy.position.x;
        const dy = player.position.y - enemy.position.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        newEnemy.position.x += (dx/len) * newEnemy.stats.speed * dt;
        newEnemy.position.y += (dy/len) * newEnemy.stats.speed * dt;
      }

      if (distanceToPlayer < enemy.size && (now - (lastCombatTimeRef.current[enemy.id] || 0) > 1000)) {
        lastCombatTimeRef.current[enemy.id] = now;
        
        const damageToPlayer = Math.max(1, enemy.stats.attack - player.stats.defense);
        addMessage(`💥 Took ${damageToPlayer} damage!`);
        setScreenShake(10);
        setHitEffects(prev => ({...prev, [player.id]: now}));
        setDamageNumbers(prev => [...prev, {
          id: `${now}-${Math.random()}`, text: `-${damageToPlayer}`,
          position: { x: player.position.x + PLAYER_SIZE / 2, y: player.position.y },
          timestamp: now, color: 'text-red-500'
        }]);
        setPlayer(p => ({ ...p, currentHealth: Math.max(0, p.currentHealth - damageToPlayer)}));
        
        const playerAttack = player.stats.attack + (player.equippedWeapon?.damage || 0);
        const damageToEnemy = Math.max(1, playerAttack - enemy.stats.defense);
        addMessage(`⚔️ Dealt ${damageToEnemy} damage!`);
        newEnemy.currentHealth = Math.max(0, newEnemy.currentHealth - damageToEnemy);
        setHitEffects(prev => ({...prev, [newEnemy.id]: now}));
        setDamageNumbers(prev => [...prev, {
          id: `${now}-${Math.random()}`, text: `-${damageToEnemy}`,
          position: { x: newEnemy.position.x + newEnemy.size / 2, y: newEnemy.position.y },
          timestamp: now, color: 'text-yellow-300'
        }]);
      }
      return newEnemy;
    });

    let newItems = [...currentMapData.items];
    updatedEnemies = updatedEnemies.filter(enemy => {
      if (enemy.currentHealth > 0) return true;
      
      if (enemy.id.startsWith('boss_RIFT_LORD')) {
        addMessage(`👑 THE RIFT LORD IS VANQUISHED!`);
        onGameWon();
        return false;
      }
      addMessage(`💀 ${enemy.isBoss ? 'Boss' : 'Enemy'} vanquished!`);
      if (Math.random() > 0.3 || enemy.isBoss) {
        newItems.push({ item: generateItem(), position: enemy.position });
      }
      return false;
    });

    newItems = newItems.filter(i => {
      if (!pickedUpItemIds.current.has(i.item.id) && getDistance(player.position, i.position) < PLAYER_SIZE * 0.75) {
        pickedUpItemIds.current.add(i.item.id);
        addMessage(`⭐ Picked up ${i.item.name}!`);
        setPlayer(p => {
          const newPlayer = {...p, inventory: [...p.inventory, i.item]};
          if (i.item.type === ItemType.UPGRADE) {
            const upgrade = i.item as Upgrade;
            Object.keys(upgrade.statBoost).forEach(key => {
              const stat = key as keyof PlayerStats;
              newPlayer.stats[stat] = (newPlayer.stats[stat] || 0) + (upgrade.statBoost[stat] || 0);
            });
            newPlayer.currentHealth = Math.min(newPlayer.stats.maxHealth, newPlayer.currentHealth + (upgrade.statBoost.maxHealth || 10));
          } else if (i.item.type === ItemType.WEAPON) {
            const weapon = i.item as Weapon;
            if (!newPlayer.equippedWeapon || weapon.damage > newPlayer.equippedWeapon.damage) {
              newPlayer.equippedWeapon = weapon;
              addMessage(`Equipped ${weapon.name}.`);
            }
          }
          return newPlayer;
        });
        return false;
      }
      return true;
    });

    if (currentMapData.enemies.length !== updatedEnemies.length || currentMapData.items.length !== newItems.length) {
      setWorld(prev => new Map(prev).set(currentMapKey, { ...currentMapData, enemies: updatedEnemies, items: newItems }));
    }
  };

  useGameLoop(updateGame);

  return (
    <div className="w-full h-full flex flex-col">
      <GameUI player={player} onExit={onExit} messages={messages} currentMapKey={currentMapKey} />
      <div 
        ref={gameContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex-grow w-full bg-gray-800 overflow-hidden relative cursor-pointer touch-none"
      >
        {currentMapData && (
          <PlayfieldView 
            key={currentMapKey}
            playerPosition={player.position} 
            playfield={currentMapData.playfield} 
            items={currentMapData.items} 
            enemies={currentMapData.enemies} 
            player={player}
            screenShake={screenShake}
            hitEffects={hitEffects}
            damageNumbers={damageNumbers}
            moveTarget={moveTarget}
            colors={currentMapData.colors}
          />
        )}
      </div>
    </div>
  );
};

export default GameView;