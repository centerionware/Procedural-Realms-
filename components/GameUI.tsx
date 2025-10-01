import React, { useRef, useEffect } from 'react';
import { Player } from '../types';

interface GameUIProps {
  player: Player;
  onExit: () => void;
  messages: string[];
  currentMapKey: string;
}

const GOAL_COORDS = { x: 10, y: 10 };

const GameUI: React.FC<GameUIProps> = ({ player, onExit, messages, currentMapKey }) => {
  const healthPercentage = (player.currentHealth / player.stats.maxHealth) * 100;
  
  const [currentX, currentY] = currentMapKey.split(',').map(Number);
  const angle = Math.atan2(GOAL_COORDS.y - currentY, GOAL_COORDS.x - currentX) * (180 / Math.PI);
  const isAtGoal = currentX === GOAL_COORDS.x && currentY === GOAL_COORDS.y;

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full bg-gray-900/80 p-2 md:p-4 flex justify-between items-center shadow-lg z-50">
      <div className="flex items-start gap-4 md:gap-6">
        <div>
          <p className="text-sm text-cyan-400">HEALTH</p>
          <div className="w-32 md:w-40 h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${healthPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs font-bold">{player.currentHealth} / {player.stats.maxHealth}</p>
        </div>
        <div className="hidden md:flex flex-col text-xs">
          <p className="text-sm text-cyan-400">STATS</p>
          <div className="flex gap-4">
            <span>ATK: <span className="font-bold text-white">{player.stats.attack}</span></span>
            <span>DEF: <span className="font-bold text-white">{player.stats.defense}</span></span>
            <span>SPD: <span className="font-bold text-white">{player.stats.speed}</span></span>
          </div>
        </div>
        <div className="hidden md:block">
          <p className="text-sm text-cyan-400">WEAPON</p>
          <p className="text-xs">{player.equippedWeapon?.name || 'Fists'}</p>
        </div>
      </div>
      
      <div className="absolute top-2 right-20 md:top-4 md:right-24 flex items-center gap-2">
         <p className="text-xs text-gray-400 hidden sm:block">Goal: {GOAL_COORDS.x},{GOAL_COORDS.y}</p>
        <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
        {isAtGoal ? (
          <span className="text-lg text-red-500 animate-pulse">!</span>
        ) : (
          <div style={{ transform: `rotate(${angle}deg)` }}>
            <span className="text-cyan-400 text-lg">↑</span>
          </div>
        )}
        </div>
      </div>

      <div 
        ref={logContainerRef}
        className="absolute bottom-2 left-2 md:bottom-4 md:left-4 text-xs text-gray-300 bg-black/30 p-2 rounded max-w-sm max-h-24 overflow-y-auto"
      >
        {messages.map((msg, index) => (
          <p key={index} className="leading-tight">{msg}</p>
        ))}
      </div>

      <button 
        onClick={onExit}
        className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-md hover:bg-red-500 transition-colors duration-200"
      >
        EXIT
      </button>
    </div>
  );
};

export default GameUI;