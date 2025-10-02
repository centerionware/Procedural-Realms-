import { Playfield, TileType, MapColors, Vector2 } from '../../types';
import { TILE_SIZE } from '../../components/GameView';

// --- Seeded PRNG (for deterministic generation) ---
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// --- World Maze Generation ---

let highwayEdges: Set<string> = new Set();
let worldSeed = 0;

export const initializeWorldSeed = (seed: number) => {
    worldSeed = seed;
    const path_5_5 = generateWindingPath("0,0", "5,5");
    const path_10_10 = generateWindingPath("0,0", "10,10");
    highwayEdges = new Set([...path_5_5, ...path_10_10]);
};

/**
 * Generates a winding, deterministic path of edges between two points on the world grid.
 * @returns A Set of edge strings, e.g., "0,0:0,1".
 */
const generateWindingPath = (startKey: string, endKey: string): Set<string> => {
    const pathEdges = new Set<string>();
    const [startX, startY] = startKey.split(',').map(Number);
    const [endX, endY] = endKey.split(',').map(Number);
    
    let [currentX, currentY] = [startX, startY];
    let previousKey = startKey;

    const seed = hashCode(startKey + endKey) ^ worldSeed;
    const random = mulberry32(seed);

    let safety = 0;
    while ((currentX !== endX || currentY !== endY) && safety < 500) {
        const dx = Math.sign(endX - currentX);
        const dy = Math.sign(endY - currentY);
        
        const preferHorizontal = Math.abs(endX - currentX) > Math.abs(endY - currentY);
        let moveX = 0;
        let moveY = 0;
        const randomChoice = random();

        if (dx !== 0 && dy !== 0) { // Can move towards goal on either axis
            if (preferHorizontal) {
                if (randomChoice < 0.7) moveX = dx; else moveY = dy;
            } else {
                if (randomChoice < 0.7) moveY = dy; else moveX = dx;
            }
        } else if (dx !== 0) { // Only horizontal distance to cover
            if (randomChoice < 0.8) moveX = dx; else moveY = (random() < 0.5 ? 1 : -1);
        } else if (dy !== 0) { // Only vertical distance to cover
            if (randomChoice < 0.8) moveY = dy; else moveX = (random() < 0.5 ? 1 : -1);
        } else {
            break; // Reached destination
        }
        
        currentX += moveX;
        currentY += moveY;
        
        const currentKey = `${currentX},${currentY}`;
        const edge = [previousKey, currentKey].sort().join(':');
        pathEdges.add(edge);
        previousKey = currentKey;
        safety++;
    }
    return pathEdges;
};

/**
 * Determines which of the four exits for a given room are open, based on the guaranteed
 * highway path and random side-paths.
 */
const getRoomExits = (x: number, y: number): { north: boolean, east: boolean, south: boolean, west: boolean } => {
  const currentKey = `${x},${y}`;
  const CHANCE_FOR_SIDE_PATH = 0.15;

  const checkConnection = (key1: string, key2: string, seedKey: string) => {
    const edge = [key1, key2].sort().join(':');
    if (highwayEdges.has(edge)) return true;
    const seed = hashCode(seedKey) ^ worldSeed;
    return mulberry32(seed)() < CHANCE_FOR_SIDE_PATH;
  };

  const eastOpen = checkConnection(currentKey, `${x + 1},${y}`, `${x},${y}:h`);
  const westOpen = checkConnection(currentKey, `${x - 1},${y}`, `${x - 1},${y}:h`);
  const southOpen = checkConnection(currentKey, `${x},${y + 1}`, `${x},${y}:v`);
  const northOpen = checkConnection(currentKey, `${x},${y - 1}`, `${x},${y - 1}:v`);

  return { north: northOpen, east: eastOpen, south: southOpen, west: westOpen };
};


export const findValidSpawnPosition = (playfield: Playfield, worldWidth: number, worldHeight: number): Vector2 => {
    let attempts = 0;
    const widthInTiles = playfield[0].length;
    const heightInTiles = playfield.length;

    while (attempts < 100) {
        const tileX = Math.floor(Math.random() * widthInTiles);
        const tileY = Math.floor(Math.random() * heightInTiles);

        if (playfield[tileY] && playfield[tileY][tileX] === TileType.FLOOR) {
            return {
                x: tileX * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
                y: tileY * TILE_SIZE + (Math.random() * (TILE_SIZE / 2)),
            };
        }
        attempts++;
    }
    return { x: worldWidth / 2, y: worldHeight / 2 };
};

const COLOR_PALETTES: MapColors[] = [
    { floor: '#4a5568', wall: '#2d3748' }, // Default Gray
    { floor: '#44403c', wall: '#292524' }, // Stone
    { floor: '#57534e', wall: '#292524' }, // Dark Stone
    { floor: '#0c4a6e', wall: '#1e3a8a' }, // Deep Blue
    { floor: '#3f6212', wall: '#1a2e05' }, // Forest Green
    { floor: '#7c2d12', wall: '#451a03' }, // Cavern Brown
    { floor: '#581c87', wall: '#3b0764' }, // Amethyst
];

// --- Layout Generation Functions ---

const createOpenLayout = (field: Playfield, width: number, height: number, random: () => number) => {
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (random() < 0.1) { // less cluttered
              field[y][x] = TileType.WALL;
            }
        }
    }
};

const createPillarLayout = (field: Playfield, width: number, height: number, random: () => number) => {
    const spacing = 4 + Math.floor(random() * 3);
    for (let y = spacing; y < height - spacing; y += spacing) {
        for (let x = spacing; x < width - spacing; x += spacing) {
            if (random() > 0.3) {
                field[y][x] = TileType.WALL;
            }
        }
    }
};

const createMazeLayout = (field: Playfield, width: number, height: number, random: () => number) => {
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (random() < 0.35) {
                field[y][x] = TileType.WALL;
            }
        }
    }
};

const createRoomLayout = (field: Playfield, width: number, height: number, random: () => number) => {
    const roomWidth = 8 + Math.floor(random() * 10);
    const roomHeight = 8 + Math.floor(random() * 10);
    const roomX = 5 + Math.floor(random() * (width - roomWidth - 10));
    const roomY = 5 + Math.floor(random() * (height - roomHeight - 10));
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
             field[y][x] = TileType.WALL;
        }
    }
    for (let y = roomY; y < roomY + roomHeight; y++) {
        for (let x = roomX; x < roomX + roomWidth; x++) {
            field[y][x] = TileType.FLOOR;
        }
    }
};

const carveGuaranteedPath = (field: Playfield, width: number, height: number, random: () => number) => {
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);

    const carve = (x: number, y: number, brushSize: number) => {
        const offset = Math.floor(brushSize / 2);
        for (let i = -offset; i <= offset; i++) {
            for (let j = -offset; j <= offset; j++) {
                const carveX = x + i;
                const carveY = y + j;
                if (carveX > 0 && carveX < width - 1 && carveY > 0 && carveY < height - 1) {
                    field[carveY][carveX] = TileType.FLOOR;
                }
            }
        }
    };

    const targets = [
        { x: midX, y: 1 },         // North
        { x: midX, y: height - 2 }, // South
        { x: 1, y: midY },         // West
        { x: width - 2, y: midY }   // East
    ];

    targets.forEach(target => {
        let currentX = midX;
        let currentY = midY;
        let pathWidth = 1 + Math.floor(random() * 5); // 1 to 5

        for(let i=0; i < (width + height) * 2; i++) { // Loop guard
            if (currentX === target.x && currentY === target.y) break;
            
            if (random() < 0.1) {
                pathWidth = 1 + Math.floor(random() * 5);
            }

            carve(currentX, currentY, pathWidth);

            const dx = Math.sign(target.x - currentX);
            const dy = Math.sign(target.y - currentY);
            
            const moveChoice = random();
            
            if (dx !== 0 && dy !== 0) {
                 if (moveChoice < 0.5) {
                     currentX += dx;
                 } else {
                     currentY += dy;
                 }
            } 
            else if (dx !== 0) {
                if (moveChoice < 0.8) {
                    currentX += dx;
                } else {
                    currentY += (random() < 0.5 ? 1 : -1);
                }
            } 
            else if (dy !== 0) {
                 if (moveChoice < 0.8) {
                    currentY += dy;
                } else {
                    currentX += (random() < 0.5 ? 1 : -1);
                }
            }

            currentX = Math.max(1, Math.min(width - 2, currentX));
            currentY = Math.max(1, Math.min(height - 2, currentY));
        }
        carve(target.x, target.y, pathWidth);
    });
};


export const generatePlayfield = (width: number, height: number, mapKey: string): { playfield: Playfield, colors: MapColors } => {
  const seed = hashCode(mapKey) ^ worldSeed;
  const random = mulberry32(seed);
  const colors = COLOR_PALETTES[Math.floor(random() * COLOR_PALETTES.length)];

  const field: Playfield = Array(height).fill(null).map(() => Array(width).fill(TileType.FLOOR));

  // Start with a border of walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        field[y][x] = TileType.WALL;
      }
    }
  }
  
  // Generate the interior layout
  const layoutType = random();
  if (layoutType < 0.25) {
      createOpenLayout(field, width, height, random);
  } else if (layoutType < 0.5) {
      createPillarLayout(field, width, height, random);
  } else if (layoutType < 0.75) {
      createMazeLayout(field, width, height, random);
  } else {
      createRoomLayout(field, width, height, random);
  }

  // Ensure the interior is navigable
  carveGuaranteedPath(field, width, height, random);

  // Ensure spawn area is clear in the starting room
  if (mapKey === '0,0') {
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    for (let y = midY - 2; y <= midY + 2; y++) {
      for (let x = midX - 2; x <= midX + 2; x++) {
        if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
          field[y][x] = TileType.FLOOR;
        }
      }
    }
  }

  // --- NEW: Set exits based on world maze logic ---
  const [mapX, mapY] = mapKey.split(',').map(Number);
  const exits = getRoomExits(mapX, mapY);
  const exitMidY = Math.floor(height / 2);
  const exitMidX = Math.floor(width / 2);

  const exitTiles = [
    { dir: 'west',  isOpen: exits.west,  x: 0,       y: exitMidY },
    { dir: 'east',  isOpen: exits.east,  x: width-1, y: exitMidY },
    { dir: 'north', isOpen: exits.north, x: exitMidX,  y: 0 },
    { dir: 'south', isOpen: exits.south, x: exitMidX,  y: height-1 },
  ];
  
  exitTiles.forEach(({ isOpen, x, y, dir }) => {
    const tileType = isOpen ? TileType.FLOOR : TileType.WALL;
    const exitSize = 1;
    if (dir === 'north' || dir === 'south') {
      for (let i = -exitSize; i <= exitSize; i++) {
        field[y][x + i] = tileType;
      }
    } else { // east or west
      for (let i = -exitSize; i <= exitSize; i++) {
        field[y + i][x] = tileType;
      }
    }
  });

  return { playfield: field, colors };
};
