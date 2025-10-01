
import { Character, CharacterSpriteData } from '../../types';

const COLORS = ['#ef4444', '#f97316', '#84cc16', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];
const BODY_SHAPES: CharacterSpriteData['bodyShape'][] = ['circle', 'square'];
const EYE_SHAPES: CharacterSpriteData['eyeShape'][] = ['circle', 'square'];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateCharacterSprite = (): CharacterSpriteData => {
  return {
    bodyColor: getRandomElement(COLORS),
    eyeColor: '#FFFFFF',
    bodyShape: getRandomElement(BODY_SHAPES),
    eyeShape: getRandomElement(EYE_SHAPES),
  };
};

export const generateCharacter = (): Character => {
  return {
    id: `char_${Date.now()}_${Math.random()}`,
    sprite: generateCharacterSprite(),
  };
};
