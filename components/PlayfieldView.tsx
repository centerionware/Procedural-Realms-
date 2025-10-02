import React, { useRef, useEffect } from 'react';
import { Player, Playfield, Item, Vector2, TileType, Enemy, ItemType, DamageNumber, MapColors, CharacterSpriteData } from '../types';
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

const getTileColor = (tile: TileType, colors: MapColors): string => {
  switch (tile) {
    case TileType.WALL: return colors.wall;
    case TileType.TREASURE: return '#f59e0b';
    case TileType.EXIT: return 'rgba(59, 130, 246, 0.5)';
    case TileType.FLOOR:
    default:
      return colors.floor;
  }
};

// Replaces CharacterSprite.tsx for canvas rendering
const drawCharacter = (ctx: CanvasRenderingContext2D, spriteData: CharacterSpriteData, size: number) => {
  const { bodyColor, eyeColor, bodyShape, eyeShape } = spriteData;
  const halfSize = size / 2;
  const radius = size * 0.45;

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.fillStyle = bodyColor;

  ctx.beginPath();
  if (bodyShape === 'circle') {
    ctx.arc(halfSize, halfSize, radius, 0, Math.PI * 2);
  } else {
    const cornerRadius = size * 0.1;
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(size - cornerRadius, 0);
    ctx.quadraticCurveTo(size, 0, size, cornerRadius);
    ctx.lineTo(size, size - cornerRadius);
    ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
    ctx.lineTo(cornerRadius, size);
    ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = eyeColor;

  if (eyeShape === 'circle') {
    const eyeRadius = size * 0.08;
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.4, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.65, size * 0.4, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const eyeSize = size * 0.16;
    ctx.fillRect(size * 0.27, size * 0.32, eyeSize, eyeSize);
    ctx.fillRect(size * 0.57, size * 0.32, eyeSize, eyeSize);
  }
};

const PlayfieldView: React.FC<PlayfieldViewProps> = ({ playerPosition, playfield, items, enemies, player, screenShake, hitEffects, damageNumbers, moveTarget, colors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    };

    const draw = (time: number) => {
      resizeCanvas();
      const { width, height } = canvas;
      
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = colors.floor;
      ctx.fillRect(0, 0, width, height);

      const cameraX = playerPosition.x + TILE_SIZE / 2;
      const cameraY = playerPosition.y + TILE_SIZE / 2;
      const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;
      const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2 : 0;

      ctx.save();
      ctx.translate(Math.round(width / 2), Math.round(height / 2));
      ctx.translate(Math.round(-cameraX - shakeX), Math.round(-cameraY - shakeY));

      // Draw Playfield (Visible part only)
      const startCol = Math.max(0, Math.floor((cameraX - width / 2) / TILE_SIZE));
      const endCol = Math.min(playfield[0].length, Math.ceil((cameraX + width / 2) / TILE_SIZE));
      const startRow = Math.max(0, Math.floor((cameraY - height / 2) / TILE_SIZE));
      const endRow = Math.min(playfield.length, Math.ceil((cameraY + height / 2) / TILE_SIZE));
      
      ctx.strokeStyle = 'rgba(17, 24, 39, 0.2)';
      ctx.lineWidth = 1;

      for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
          const tile = playfield[y][x];
          if (tile !== TileType.FLOOR) {
            ctx.fillStyle = getTileColor(tile, colors);
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }

      // Draw Move Target
      if (moveTarget) {
        const pulseTime = (time % 1500) / 1500;
        const scale = 1 - 0.2 * Math.sin(pulseTime * Math.PI);
        const opacity = 0.7 - 0.3 * Math.sin(pulseTime * Math.PI);
        
        ctx.save();
        ctx.translate(moveTarget.x, moveTarget.y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, TILE_SIZE * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Items
      items.forEach(({ item, position }) => {
        ctx.save();
        ctx.translate(position.x, position.y);
        const alpha = 0.75 + Math.sin(time / 200) * 0.25;
        ctx.globalAlpha = alpha;
        if (item.type === ItemType.EASTER_EGG) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, TILE_SIZE * 0.075, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = item.type === ItemType.WEAPON ? '#ef4444' : '#34d399';
          ctx.beginPath();
          ctx.arc(0, 0, TILE_SIZE * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Enemies
      enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(Math.round(enemy.position.x), Math.round(enemy.position.y));
        drawCharacter(ctx, enemy.character.sprite, enemy.size);
        const isHit = hitEffects[enemy.id] && Date.now() - hitEffects[enemy.id] < 200;
        if (isHit) {
            const hitProgress = (Date.now() - hitEffects[enemy.id]) / 200;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - hitProgress)})`;
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            ctx.arc(enemy.size/2, enemy.size/2, enemy.size/2 * 1.1, 0, Math.PI*2)
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();

        const barWidth = enemy.size;
        const barHeight = 4;
        const barX = Math.round(enemy.position.x);
        const barY = Math.round(enemy.position.y - barHeight - 4);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, barWidth * (enemy.currentHealth / enemy.stats.maxHealth), barHeight);
      });

      // Draw Player
      ctx.save();
      ctx.translate(Math.round(playerPosition.x), Math.round(playerPosition.y));
      drawCharacter(ctx, player.character.sprite, TILE_SIZE);
      const isPlayerHit = hitEffects[player.id] && Date.now() - hitEffects[player.id] < 200;
      if (isPlayerHit) {
          const hitProgress = (Date.now() - hitEffects[player.id]) / 200;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - hitProgress)})`;
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          ctx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2 * 1.1, 0, Math.PI*2)
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      ctx.restore(); // Restore from camera transform

      // Draw Damage Numbers (in screen space for crispness)
      ctx.font = 'bold 1.25rem monospace';
      ctx.textAlign = 'center';
      damageNumbers.forEach((dn) => {
        const age = (Date.now() - dn.timestamp) / 1000;
        const yOffset = age * 60;
        const alpha = Math.max(0, 1 - age);
        
        // Convert world coords to screen coords
        const screenX = Math.round((dn.position.x - cameraX) + width / 2 - shakeX);
        const screenY = Math.round((dn.position.y - cameraY) + height / 2 - shakeY);
        
        ctx.fillStyle = dn.color === 'text-red-500' ? `rgba(239, 68, 68, ${alpha})` : `rgba(252, 211, 77, ${alpha})`;
        ctx.shadowColor = "black";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(dn.text, screenX, screenY - yOffset);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });

      animationFrameId.current = requestAnimationFrame(draw);
    };

    animationFrameId.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [playerPosition, playfield, items, enemies, player, screenShake, hitEffects, damageNumbers, moveTarget, colors]);

  return <canvas ref={canvasRef} style={{ touchAction: 'none' }} />;
};

export default PlayfieldView;
