import React from 'react';
import { Player, Playfield, Item, Vector2, TileType, Enemy, ItemType, DamageNumber, MapColors } from '../types';
import CharacterSprite from './CharacterSprite';
import { TILE_SIZE } from './GameView';

interface PlayfieldViewProps {
  playerPosition: Vector2;
  playfield: Playfield;
  items: ({ item: Item } & { position: Vector2 })[];
  enemies: Enemy[];
  player: Player;
  screenShake: number;
  hitEffects: { [id: string]: number };
  damageNumbers: DamageNumber[];
  moveTarget: Vector2 | null;
  colors: MapColors;
}

const getTileStyle = (tile: TileType, colors: MapColors): React.CSSProperties => {
  switch (tile) {
    case TileType.WALL: return { backgroundColor: colors.wall };
    case TileType.TREASURE: return { backgroundColor: '#f59e0b' };
    case TileType.EXIT: return { backgroundColor: '#3b82f6', opacity: 0.5 };
    case TileType.FLOOR:
    default:
      return { backgroundColor: colors.floor };
  }
};

const PlayfieldView: React.FC<PlayfieldViewProps> = ({ playerPosition, playfield, items, enemies, player, screenShake, hitEffects, damageNumbers, moveTarget, colors }) => {
  const offsetX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const offsetY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

  const cameraStyle: React.CSSProperties = {
    transform: `translate(calc(50vw - ${playerPosition.x + offsetX}px - ${TILE_SIZE/2}px), calc(50vh - ${playerPosition.y + offsetY}px - ${TILE_SIZE/2}px))`,
    transition: 'transform 0.1s linear'
  };

  return (
    <div style={cameraStyle} className="absolute top-0 left-0">
      {/* Render Playfield */}
      {playfield.map((row, y) => (
        <div key={y} className="flex">
          {row.map((tile, x) => (
            <div
              key={`${x}-${y}`}
              className={`w-10 h-10 border border-gray-900/20`}
              style={{ 
                position: 'absolute', 
                top: y * TILE_SIZE, 
                left: x * TILE_SIZE,
                ...getTileStyle(tile, colors)
              }}
            ></div>
          ))}
        </div>
      ))}

      {/* Render Move Target Indicator */}
      {moveTarget && (
        <div
          className="absolute w-8 h-8"
          style={{
            left: moveTarget.x,
            top: moveTarget.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-full h-full border-2 border-cyan-400 rounded-full animate-move-target-pulse"></div>
        </div>
      )}

      {/* Render Items */}
      {items.map(({ item, position }) => {
        if (item.type === ItemType.EASTER_EGG) {
          return (
             <div
              key={item.id}
              className="w-3 h-3 rounded-full absolute animate-pulse bg-white"
              style={{ left: position.x, top: position.y }}
              title={item.name}
            ></div>
          );
        }
        return (
          <div
            key={item.id}
            className="w-4 h-4 rounded-full absolute animate-pulse"
            style={{ 
              left: position.x, 
              top: position.y,
              backgroundColor: item.type === ItemType.WEAPON ? '#ef4444' : '#34d399' 
            }}
            title={item.name}
          ></div>
        );
      })}
      
      {/* Render Enemies */}
      {enemies.map((enemy) => {
        const isHit = hitEffects[enemy.id] && Date.now() - hitEffects[enemy.id] < 200;
        return (
          <div
            key={enemy.id}
            className={`absolute transition-all duration-100 ${isHit ? 'animate-hit' : ''}`}
            style={{ 
              left: enemy.position.x, 
              top: enemy.position.y,
              width: enemy.size,
              height: enemy.size,
            }}
          >
            <CharacterSprite spriteData={enemy.character.sprite} />
            <div className="absolute -top-2 w-full h-1 bg-gray-900 rounded-full">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(enemy.currentHealth / enemy.stats.maxHealth) * 100}%` }}
              ></div>
            </div>
          </div>
        );
      })}

      {/* Render Player */}
      {(() => {
        const isPlayerHit = hitEffects[player.id] && Date.now() - hitEffects[player.id] < 200;
        return (
          <div 
            className={`absolute w-10 h-10 transition-all duration-100 ${isPlayerHit ? 'animate-hit' : ''}`}
            style={{ left: playerPosition.x, top: playerPosition.y }}
          >
            <CharacterSprite spriteData={player.character.sprite} />
          </div>
        );
      })()}

      {/* Render Damage Numbers */}
      {damageNumbers.map((dn) => {
        const age = (Date.now() - dn.timestamp) / 1000; // age in seconds
        const style: React.CSSProperties = {
          left: dn.position.x,
          top: dn.position.y - (age * 60), // move up
          opacity: 1 - age,
          position: 'absolute',
          fontWeight: 'bold',
          fontSize: '1.25rem',
          textShadow: '1px 1px 2px black',
          pointerEvents: 'none',
          zIndex: 100,
          transition: 'opacity 0.2s linear, top 0.2s linear',
        };
        return <div key={dn.id} style={style} className={dn.color}>{dn.text}</div>;
      })}
    </div>
  );
};

export default PlayfieldView;
