
import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800 rounded-lg shadow-2xl animate-fade-in">
      <h1 className="text-5xl md:text-7xl font-bold text-cyan-400 mb-2 tracking-widest">
        PROCEDURAL REALMS
      </h1>
      <p className="text-lg text-gray-400 mb-8">An Endless Adventure Awaits</p>
      <button
        onClick={onStartGame}
        className="px-8 py-4 bg-cyan-500 text-gray-900 font-bold text-xl rounded-md hover:bg-cyan-400 transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-cyan-300"
      >
        START GAME
      </button>
    </div>
  );
};

export default MainMenu;
