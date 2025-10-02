import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from './types';
import MainMenu from './components/MainMenu';
import GameView from './components/GameView';
import GameOver from './components/GameOver';
import GameWon from './components/GameWon';
import Credits from './components/Credits';
import { initializeWorldSeed } from './game/generators/playfieldGenerator';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showOpenInNewTabButton, setShowOpenInNewTabButton] = useState(false);
  
  const installPromptRef = useRef(installPrompt);
  installPromptRef.current = installPrompt;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // If the prompt appears, we don't need the fallback button.
      setShowOpenInNewTabButton(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if running in a sandboxed iframe where install prompts may be blocked.
    const inIframe = window.self !== window.top;
    let timer: number | undefined;

    if (inIframe) {
      // After a delay, if the prompt hasn't appeared, show a fallback button.
      // This gives the browser a chance to fire the event before we assume it's blocked.
      timer = window.setTimeout(() => {
        // Use a ref to check the latest value and avoid stale closures.
        if (!installPromptRef.current) {
          setShowOpenInNewTabButton(true);
        }
      }, 3000); // 3-second delay
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []); // This effect should run only once on component mount.

  const handleInstallClick = useCallback(() => {
    if (!installPrompt) {
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  }, [installPrompt]);
  
  const handleOpenInNewTab = useCallback(() => {
    window.open(window.location.href, '_blank');
  }, []);

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
        return (
          <MainMenu 
            onStartGame={startGame} 
            onInstall={handleInstallClick} 
            showInstallButton={!!installPrompt}
            onOpenInNewTab={handleOpenInNewTab}
            showOpenInNewTabButton={showOpenInNewTabButton}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 text-gray-100 font-mono flex flex-col items-center justify-center">
      {renderContent()}
    </div>
  );
};

export default App;
