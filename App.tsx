import React, { useState, useCallback } from 'react';
import { GameState } from './types';
import MainMenu from './components/MainMenu';
import GameView from './components/GameView';
import GameOver from './components/GameOver';
import GameWon from './components/GameWon';
import Credits from './components/Credits';
import { initializeWorldSeed } from './game/generators/playfieldGenerator';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU);

  const startGame = useCallback(() => {
    initializeWorldSeed(Date.now());
    setGameState(GameState.IN_GAME);
  }, []);

  const backToMenu = useCallback(() => {
    setGameState(GameState.MAIN_MENU);
  }, []);

  const gameOver = useCallback(() => {
    setGameState(GameState.GAME_OVER);
  }, []);

  const gameWon = useCallback(() => {
    setGameState(GameState.GAME_WON);
  }, []);

  const showCredits = useCallback(() => {
    setGameState(GameState.SHOW_CREDITS);
  }, []);

  const renderContent = () => {
    switch (gameState) {
      case GameState.IN_GAME:
        return <GameView onExit={backToMenu} onGameOver={gameOver} onGameWon={gameWon} onShowCredits={showCredits} />;
      case GameState.GAME_OVER:
        return <GameOver onRestart={backToMenu} />;
      case GameState.GAME_WON:
        return <GameWon onRestart={backToMenu} />;
      case GameState.SHOW_CREDITS:
        return <Credits onRestart={backToMenu} />;
      case GameState.MAIN_MENU:
      default:
        return <MainMenu onStartGame={startGame} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 text-gray-100 font-mono flex flex-col items-center justify-center">
      {renderContent()}
    </div>
  );
};

export default App;
