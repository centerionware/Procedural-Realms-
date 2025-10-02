import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, Item, Enemy, Vector2, ItemType, Weapon, Upgrade, PlayerStats, DamageNumber, WorldMap, Playfield, TileType } from '../types';
import { generateInitialPlayer } from '../game/player';
import { generatePlayfield } from '../game/generators/playfieldGenerator';
import { generateInitialItems, generateItem, generateEasterEgg } from '../game/generators/itemGenerator';
import { populateEnemies } from '../game/generators/enemyGenerator';
import useGameLoop from '../hooks/useGameLoop';
import usePlayerInput from '../hooks/usePlayerInput';
import GameUI from './GameUI';
import PlayfieldView from './PlayfieldView';
import { AudioManager } from '../game/audio';

export const TILE_SIZE = 40;
export const PLAYER_SIZE = 40;
export const MAP_WIDTH_TILES = 50;
export const MAP_HEIGHT_TILES = 50;

type TransitionType = 'FADE' | 'IRIS' | 'ZOOM';
interface TransitionState {
  type: TransitionType;
  progress: number; // 0 to 1
  duration: number;
  isMidpointReached: boolean;
  nextMapData: { key: string; position: Vector2 };
}

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

const findNearestValidTile = (pos: Vector2, playfield: Playfield): Vector2 => {
    const startTileX = Math.floor(pos.x / TILE_SIZE);
    const startTileY = Math.floor(pos.y / TILE_SIZE);

    // Spiral search
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = -1;
    const maxRadius = 10; // Search up to 10 tiles away

    for (let i = 0; i < Math.pow(maxRadius * 2 + 1, 2); i++) {
        const checkTileX = startTileX + x;
        const checkTileY = startTileY + y;

        if (checkTileX >= 0 && checkTileX < playfield[0].length && checkTileY >= 0 && checkTileY < playfield.length) {
            const potentialPos = {
                x: checkTileX * TILE_SIZE + TILE_SIZE / 2 - PLAYER_SIZE / 2,
                y: checkTileY * TILE_SIZE + TILE_SIZE / 2 - PLAYER_SIZE / 2
            };
            if (!isColliding(potentialPos, playfield)) {
                return potentialPos;
            }
        }

        if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
            [dx, dy] = [-dy, dx];
        }
        x += dx;
        y += dy;
    }
    
    // Failsafe: return center of map
    return { 
        x: (playfield[0].length * TILE_SIZE) / 2, 
        y: (playfield.length * TILE_SIZE) / 2 
    };
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

  const [world, _setWorld] = useState<Map<string, WorldMap>>(new Map());
  const worldRef = useRef(world);
  const setWorld: React.Dispatch<React.SetStateAction<Map<string, WorldMap>>> = useCallback((action) => {
    _setWorld(currentWorld => {
        const newState = typeof action === 'function' ? (action as (prevState: Map<string, WorldMap>) => Map<string, WorldMap>)(currentWorld) : action;
        worldRef.current = newState;
        return newState;
    });
  }, []);

  const [currentMapKey, setCurrentMapKey] = useState('0,0');
  const [easterEggLocation] = useState(() => {
    const x = Math.floor(Math.random() * 20) - 10; // e.g., -10 to 9
    const y = Math.floor(Math.random() * 20) - 10;
    // Avoid 0,0, 10,10, and the immediate vicinity of 0,0
    if ((Math.abs(x) <= 1 && Math.abs(y) <= 1) || (x === 10 && y === 10)) {
        return '5,5'; // fallback
    }
    return `${x},${y}`;
  });
  
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
  const [isMuted, setIsMuted] = useState(false);
  
  const [transition, _setTransition] = useState<TransitionState | null>(null);
  const transitionRef = useRef(transition);
  const setTransition: React.Dispatch<React.SetStateAction<TransitionState | null>> = useCallback((action) => {
    _setTransition(current => {
      const newState = typeof action === 'function' ? (action as (prevState: TransitionState | null) => TransitionState | null)(current) : action;
      transitionRef.current = newState;
      return newState;
    });
  }, []);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const lastCombatTimeRef = useRef<{ [enemyId: string]: number }>({});
  const pickedUpItemIds = useRef(new Set<string>());
  const audioManager = useRef<AudioManager | null>(null);

  const currentMapData = world.get(currentMapKey);

  useEffect(() => {
    audioManager.current = new AudioManager();
    
    return () => {
      // When the component unmounts, gracefully shut down the audio manager
      // to stop music and release all audio resources.
      audioManager.current?.shutdown(200);
    };
  }, []);

  useEffect(() => {
    if (!worldRef.current.has(currentMapKey)) {
      const { playfield: newPlayfield, colors: newColors } = generatePlayfield(MAP_WIDTH_TILES, MAP_HEIGHT_TILES, currentMapKey);
      const newItems = generateInitialItems(currentMapKey, 20, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, newPlayfield, easterEggLocation);
      const newEnemies = populateEnemies(currentMapKey, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, newPlayfield, playerRef.current, 0);
      
      const newMapData: WorldMap = {
        playfield: newPlayfield,
        items: newItems,
        enemies: newEnemies,
        colors: newColors,
        clearCount: 0,
      };

      setWorld(prevWorld => new Map(prevWorld).set(currentMapKey, newMapData));
    } else {
        const existingMap = worldRef.current.get(currentMapKey)!;
        if (existingMap.enemies.length === 0 && currentMapKey !== '10,10' && currentMapKey !== '0,0') {
             const newEnemies = populateEnemies(currentMapKey, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE, existingMap.playfield, playerRef.current, existingMap.clearCount);
             setWorld(prevWorld => {
                const currentMap = prevWorld.get(currentMapKey);
                if (!currentMap) return prevWorld;
                const updatedMap = { ...currentMap, enemies: newEnemies };
                return new Map(prevWorld).set(currentMapKey, updatedMap);
             });
        }
    }
  }, [currentMapKey, setWorld, easterEggLocation]);

  useEffect(() => {
    if (!transition) return;
  
    let animationFrameId: number;
    const startTime = performance.now() - transition.progress * transition.duration;
  
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const newProgress = Math.min(elapsed / transition.duration, 1);
  
      setTransition(current => {
        if (!current) return null;
  
        // Midpoint check: this is where the world state changes
        if (newProgress >= 0.5 && !current.isMidpointReached) {
          setCurrentMapKey(current.nextMapData.key);
          setPlayer(p => ({ ...p, position: current.nextMapData.position }));
          setMoveTarget(null);
          pickedUpItemIds.current.clear();
          audioManager.current?.startMusic(current.nextMapData.key, current.duration / 2);
          
          return { ...current, progress: newProgress, isMidpointReached: true };
        }
  
        return { ...current, progress: newProgress };
      });
  
      if (newProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // End of transition
        setTransition(null);
      }
    };
  
    animationFrameId = requestAnimationFrame(animate);
  
    return () => cancelAnimationFrame(animationFrameId);
    // This effect should ONLY re-run when a new transition is initiated.
  }, [transition?.nextMapData.key]);

  const addMessage = useCallback((message: string) => {
    setMessages(prev => [...prev.slice(-10), message]);
  }, []);

  const handleMapChange = useCallback((newMapKey: string, newPlayerPosition: Vector2) => {
    if (transitionRef.current) return;
    
    const transitions: TransitionType[] = ['FADE', 'IRIS', 'ZOOM'];
    const selectedTransition = transitions[Math.floor(Math.random() * transitions.length)];
    const duration = selectedTransition === 'ZOOM' ? 1000 : 700;
    
    audioManager.current?.stopMusic(duration / 2);

    setTransition({
      type: selectedTransition,
      progress: 0,
      duration,
      isMidpointReached: false,
      nextMapData: { key: newMapKey, position: newPlayerPosition },
    });
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const am = audioManager.current;
    if (am) {
      if (!am.isInitialized) {
        am.initialize();
        am.startMusic(currentMapKey, 500); // Fade in on first interaction
      }
    }
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
  
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
        const newMutedState = !prev;
        audioManager.current?.toggleMute(newMutedState);
        return newMutedState;
    });
  }, []);

  const updateMoveTarget = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gameContainerRef.current) return;
    const rect = gameContainerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const worldX = playerRef.current.position.x + (clickX - rect.width / 2);
    const worldY = playerRef.current.position.y + (clickY - rect.height / 2);
    setMoveTarget({ x: worldX, y: worldY });
  };


  const updateGame = (deltaTime: number) => {
    if (transitionRef.current) return; // Pause game during transitions

    const currentMapData = worldRef.current.get(currentMapKey);
    if (!currentMapData) return;

    // Unstuck logic: If player is in a wall, find a safe spot and move them.
    if (isColliding(playerRef.current.position, currentMapData.playfield)) {
        const safePos = findNearestValidTile(playerRef.current.position, currentMapData.playfield);
        setPlayer(p => ({...p, position: safePos}));
        return; // Skip the rest of the update for this frame.
    }

    const now = Date.now();
    // Cap delta time to prevent massive jumps on lag spikes or tab focus
    const dt = Math.min(deltaTime, 1 / 30);
    
    const playerState = playerRef.current;
    const hasDot = playerState.inventory.some(item => item.type === ItemType.EASTER_EGG);
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
      const dx = moveTarget.x - playerState.position.x;
      const dy = moveTarget.y - playerState.position.y;
      const distance = getDistance(playerState.position, moveTarget);

      if (distance < playerState.stats.speed * dt) {
        setMoveTarget(null);
        finalDirection = { x: 0, y: 0 };
      } else {
        finalDirection = { x: dx / distance, y: dy / distance };
      }
    }
    
    // Calculate player's new state for this frame *before* using it for interactions.
    if (playerState.currentHealth <= 0) {
      onGameOver();
      return;
    }
    
    let newPos = { ...playerState.position };
    const deltaX = finalDirection.x * playerState.stats.speed * dt;
    const deltaY = finalDirection.y * playerState.stats.speed * dt;
    
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
    
    const spawnMargin = TILE_SIZE * 2;

    if (newPos.x > worldWidth - PLAYER_SIZE) {
      handleMapChange(`${mapX + 1},${mapY}`, { x: spawnMargin, y: newPos.y });
      return;
    } else if (newPos.x < 0) {
      handleMapChange(`${mapX - 1},${mapY}`, { x: worldWidth - PLAYER_SIZE - spawnMargin, y: newPos.y });
      return;
    } else if (newPos.y > worldHeight - PLAYER_SIZE) {
      handleMapChange(`${mapX},${mapY + 1}`, { x: newPos.x, y: spawnMargin });
      return;
    } else if (newPos.y < 0) {
      handleMapChange(`${mapX},${mapY - 1}`, { x: newPos.x, y: worldHeight - PLAYER_SIZE - spawnMargin });
      return;
    }
    
    // Create a temporary player state object that reflects the new position for this frame's logic.
    const playerStateForFrame = { ...playerState, position: newPos };
    
    // Queue the actual state update for React to process.
    setPlayer(p => ({ ...p, position: newPos }));
    
    const enemiesBeforeUpdate = currentMapData.enemies.length;
    let updatedEnemies = currentMapData.enemies.map(enemy => {
      const distanceToPlayer = getDistance(enemy.position, playerStateForFrame.position);
      let newEnemy = { ...enemy };

      const detectionRange = enemy.detectionRange || 400;
      if (distanceToPlayer < detectionRange && distanceToPlayer > enemy.size * 0.8) {
        const dx = playerStateForFrame.position.x - enemy.position.x;
        const dy = playerStateForFrame.position.y - enemy.position.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        newEnemy.position.x += (dx/len) * newEnemy.stats.speed * dt;
        newEnemy.position.y += (dy/len) * newEnemy.stats.speed * dt;
      }

      if (distanceToPlayer < enemy.size && (now - (lastCombatTimeRef.current[enemy.id] || 0) > 1000)) {
        lastCombatTimeRef.current[enemy.id] = now;
        
        const damageToPlayer = Math.max(1, enemy.stats.attack - playerStateForFrame.stats.defense);
        addMessage(`💥 Took ${damageToPlayer} damage!`);
        audioManager.current?.playSound('playerHit');
        setScreenShake(10);
        setHitEffects(prev => ({...prev, [playerStateForFrame.id]: now}));
        setDamageNumbers(prev => [...prev, {
          id: `${now}-${Math.random()}`, text: `-${damageToPlayer}`,
          position: { x: playerStateForFrame.position.x + PLAYER_SIZE / 2, y: playerStateForFrame.position.y },
          timestamp: now, color: 'text-red-500'
        }]);
        setPlayer(p => ({ ...p, currentHealth: Math.max(0, p.currentHealth - damageToPlayer)}));
        
        const playerAttack = playerStateForFrame.stats.attack + (playerStateForFrame.equippedWeapon?.damage || 0);
        const damageToEnemy = Math.max(1, playerAttack - enemy.stats.defense);
        addMessage(`⚔️ Dealt ${damageToEnemy} damage!`);
        audioManager.current?.playSound('enemyHit');
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
        audioManager.current?.playSound('defeat');
        onGameWon();
        return false;
      }
      addMessage(`💀 ${enemy.isBoss ? 'Boss' : 'Enemy'} vanquished!`);
      audioManager.current?.playSound('defeat');
      if (Math.random() > 0.3 || enemy.isBoss) {
        newItems.push({ item: generateItem(enemy.isBoss), position: enemy.position });
      }
      return false;
    });
    
    const wasClearedThisFrame = enemiesBeforeUpdate > 0 && updatedEnemies.length === 0 && currentMapKey !== '10,10' && currentMapKey !== '0,0';
    if (wasClearedThisFrame) {
      addMessage('A dark energy fills the area... It feels more dangerous.');
    }

    const itemsBeforePickup = newItems.length;
    newItems = newItems.filter(i => {
      if (pickedUpItemIds.current.has(i.item.id)) {
        return false;
      }

      const playerCenter = {
        x: playerStateForFrame.position.x + PLAYER_SIZE / 2,
        y: playerStateForFrame.position.y + PLAYER_SIZE / 2
      };
      const pickupRadius = PLAYER_SIZE * 0.75;

      if (getDistance(playerCenter, i.position) < pickupRadius) {
        pickedUpItemIds.current.add(i.item.id);
        audioManager.current?.playSound('pickup');
        
        let itemToAdd: Item | null = i.item;
        if (i.item.type === ItemType.GLITCHED_ITEM_CONTAINER) {
            addMessage(`❓ Picked up the Anomaly... something is stuck to you.`);
            itemToAdd = generateEasterEgg();
        } else {
            addMessage(`⭐ Picked up ${i.item.name}!`);
        }
        
        if (itemToAdd) {
            setPlayer(p => {
              const newPlayer = {...p, inventory: [...p.inventory, itemToAdd!]};
              if (itemToAdd!.type === ItemType.UPGRADE) {
                const upgrade = itemToAdd as Upgrade;
                Object.keys(upgrade.statBoost).forEach(key => {
                  const stat = key as keyof PlayerStats;
                  newPlayer.stats[stat] = (newPlayer.stats[stat] || 0) + (upgrade.statBoost[stat] || 0);
                });
                newPlayer.currentHealth = Math.min(newPlayer.stats.maxHealth, newPlayer.currentHealth + (upgrade.statBoost.maxHealth || 10));
              } else if (itemToAdd!.type === ItemType.WEAPON) {
                const weapon = itemToAdd as Weapon;
                if (!newPlayer.equippedWeapon || weapon.damage > newPlayer.equippedWeapon.damage) {
                  newPlayer.equippedWeapon = weapon;
                  addMessage(`Equipped ${weapon.name}.`);
                }
              }
              return newPlayer;
            });
        }
        return false; // Remove from list
      }
      return true; // Keep in list
    });
    const itemWasPickedUp = newItems.length < itemsBeforePickup;

    const enemiesChanged = currentMapData.enemies.length !== updatedEnemies.length;

    if (enemiesChanged || itemWasPickedUp || wasClearedThisFrame) {
      setWorld(prev => {
        const currentMap = prev.get(currentMapKey)!;
        const newClearCount = wasClearedThisFrame ? currentMap.clearCount + 1 : currentMap.clearCount;
        const newMapData = { ...currentMap, enemies: updatedEnemies, items: newItems, clearCount: newClearCount };
        return new Map(prev).set(currentMapKey, newMapData);
      });
    }
  };

  useGameLoop(updateGame);

  const getOverlayStyle = (): React.CSSProperties => {
    if (!transition) return { opacity: 0, pointerEvents: 'none' };

    const { type, progress } = transition;
    // progressOut: 0 -> 1 during the first half of the transition
    const progressOut = Math.min(1, progress / 0.5);
    // progressIn: 0 -> 1 during the second half of the transition
    const progressIn = Math.max(0, (progress - 0.5) / 0.5);

    switch (type) {
      case 'FADE':
        const opacity = progress < 0.5 ? progressOut : (1 - progressIn);
        return { opacity, pointerEvents: 'auto', transition: 'opacity 50ms linear' };
      case 'IRIS':
        const radius = progress < 0.5 ? (1 - progressOut) * 100 : progressIn * 100; // in %
        return { clipPath: `circle(${radius}% at center)`, pointerEvents: 'auto' };
      case 'ZOOM':
      default:
        return { opacity: 0, pointerEvents: 'none' };
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <GameUI 
        player={player} 
        onExit={onExit} 
        messages={messages} 
        currentMapKey={currentMapKey} 
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />
      <div 
        ref={gameContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex-grow w-full bg-gray-800 overflow-hidden relative cursor-pointer touch-none select-none"
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
            transition={transition}
          />
        )}
         <div 
            className="absolute top-0 left-0 w-full h-full bg-black"
            style={getOverlayStyle()}
        />
      </div>
    </div>
  );
};

export default GameView;
