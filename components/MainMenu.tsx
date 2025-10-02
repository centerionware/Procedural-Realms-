
import React from 'react';

interface MainMenuProps {
  onStartGame: () => void;
  onInstall: () => void;
  showInstallButton: boolean;
  onOpenInNewTab: () => void;
  showOpenInNewTabButton: boolean;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
  onStartGame, 
  onInstall, 
  showInstallButton,
  onOpenInNewTab,
  showOpenInNewTabButton,
}) => {
  const isStandalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

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
      {showInstallButton && !isStandalone && (
        <button
          onClick={onInstall}
          className="mt-4 px-8 py-4 bg-purple-600 text-white font-bold text-xl rounded-md hover:bg-purple-500 transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-300"
          aria-label="Install App"
        >
          INSTALL APP
        </button>
      )}
      {showOpenInNewTabButton && !showInstallButton && !isStandalone && (
         <div className="mt-4 text-center">
            <p className="text-sm text-gray-400 mb-2">Installation unavailable in this view.</p>
            <button
              onClick={onOpenInNewTab}
              className="px-8 py-4 bg-green-600 text-white font-bold text-xl rounded-md hover:bg-green-500 transform hover:scale-105 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-green-300"
              aria-label="Open in new tab to install"
            >
              OPEN TO INSTALL
            </button>
         </div>
      )}
    </div>
  );
};

export default MainMenu;
