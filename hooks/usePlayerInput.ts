import { useState, useEffect, useRef } from 'react';
import { Vector2 } from '../types';

const usePlayerInput = () => {
  const [direction, setDirection] = useState<Vector2>({ x: 0, y: 0 });
  const keysPressed = useRef(new Set<string>());

  useEffect(() => {
    const updateDirection = () => {
      let dx = 0;
      let dy = 0;
      if (keysPressed.current.has('w') || keysPressed.current.has('ArrowUp')) dy -= 1;
      if (keysPressed.current.has('s') || keysPressed.current.has('ArrowDown')) dy += 1;
      if (keysPressed.current.has('a') || keysPressed.current.has('ArrowLeft')) dx -= 1;
      if (keysPressed.current.has('d') || keysPressed.current.has('ArrowRight')) dx += 1;

      // Normalize diagonal movement
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      
      setDirection({ x: dx, y: dy });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      updateDirection();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
      updateDirection();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { direction };
};

export default usePlayerInput;