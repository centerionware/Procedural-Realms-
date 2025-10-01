import React from 'react';

interface GameWonProps {
  onRestart: () => void;
}

const GameWon: React.FC<GameWonProps> = ({ onRestart }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-2xl animate-fade-in">
      <h1 className="text-6xl md:text-8xl font-bold text-green-500 mb-4 tracking-widest">
        VICTORY!
      </h1>
      <p className="text-lg text-gray-400 mb-8">You have defeated the Rift Lord and saved the Procedural Realms!</p>
      <button
        onClick={onRestart}
        className="px-8 py-4 bg-cyan-500 text-gray-900 font-bold text-xl rounded-md hover:bg-cyan-400 transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-cyan-300"
      >
        PLAY AGAIN
      </button>
    </div>
  );
};

export default GameWon;
