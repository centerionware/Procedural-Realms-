import React from 'react';
import { Difficulty } from '../types';

interface DifficultyMenuProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onBack: () => void;
}

const difficultySettings = [
  { level: Difficulty.EASY, name: 'Easy', description: 'A relaxing adventure.', color: 'bg-green-600 hover:bg-green-500 ring-green-300' },
  { level: Difficulty.MEDIUM, name: 'Medium', description: 'A balanced challenge.', color: 'bg-cyan-600 hover:bg-cyan-500 ring-cyan-300' },
  { level: Difficulty.HARD, name: 'Hard', description: 'For seasoned adventurers.', color: 'bg-yellow-600 hover:bg-yellow-500 ring-yellow-300' },
  { level: Difficulty.IMPOSSIBLE, name: 'Impossible', description: 'You will not survive.', color: 'bg-red-700 hover:bg-red-600 ring-red-300' },
  { level: Difficulty.GOD_MODE, name: 'God Mode', description: 'Unleash your power.', color: 'bg-purple-700 hover:bg-purple-600 ring-purple-300' },
];


const DifficultyMenu: React.FC<DifficultyMenuProps> = ({ onSelectDifficulty, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-2xl animate-fade-in">
      <h1 className="text-4xl md:text-6xl font-bold text-cyan-400 mb-6 tracking-widest">
        CHOOSE YOUR FATE
      </h1>
      <div className="flex flex-col gap-4 mb-8">
        {difficultySettings.map(({ level, name, description, color }) => (
          <button
            key={name}
            onClick={() => onSelectDifficulty(level)}
            className={`px-8 py-3 text-white font-bold rounded-md transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 w-80 text-left ${color}`}
          >
            <span className="block text-2xl">{name}</span>
            <span className="block text-sm font-normal opacity-80">{description}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="px-6 py-3 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-500 transition-colors"
      >
        BACK
      </button>
    </div>
  );
};

export default DifficultyMenu;
