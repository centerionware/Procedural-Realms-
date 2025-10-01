
import React from 'react';
import { CharacterSpriteData } from '../types';

interface CharacterSpriteProps {
  spriteData: CharacterSpriteData;
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ spriteData }) => {
  const { bodyColor, eyeColor, bodyShape, eyeShape } = spriteData;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {bodyShape === 'circle' ? (
        <circle cx="50" cy="50" r="45" fill={bodyColor} stroke="#111827" strokeWidth="4" />
      ) : (
        <rect x="5" y="5" width="90" height="90" rx="10" fill={bodyColor} stroke="#111827" strokeWidth="4" />
      )}
      
      {eyeShape === 'circle' ? (
        <>
          <circle cx="35" cy="40" r="8" fill={eyeColor} />
          <circle cx="65" cy="40" r="8" fill={eyeColor} />
        </>
      ) : (
        <>
          <rect x="27" y="32" width="16" height="16" fill={eyeColor} />
          <rect x="57" y="32" width="16" height="16" fill={eyeColor} />
        </>
      )}
    </svg>
  );
};

export default CharacterSprite;
