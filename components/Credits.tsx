import React from 'react';

interface CreditsProps {
  onRestart: () => void;
}

const Credits: React.FC<CreditsProps> = ({ onRestart }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-2xl animate-fade-in">
      <h1 className="text-5xl md:text-7xl font-bold text-yellow-400 mb-4 tracking-widest">
        SECRET FOUND!
      </h1>
      <div className="text-lg text-gray-300 mb-8 space-y-2">
         <p>You found the Pixel of Origin!</p>
         <p>This is a nod to the first video game Easter egg, a single dot hidden in the Atari 2600 game "Adventure".</p>
         <p className="text-sm text-gray-500 pt-4">Game created by an AI assistant.</p>
      </div>
      <button
        onClick={onRestart}
        className="px-8 py-4 bg-cyan-500 text-gray-900 font-bold text-xl rounded-md hover:bg-cyan-400 transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-cyan-300"
      >
        RETURN TO MENU
      </button>
    </div>
  );
};

export default Credits;
