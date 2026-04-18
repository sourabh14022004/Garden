import { ImageSourcePropType } from 'react-native';

export const PLANT_COUNT = 30;

// All 30 plant images — deterministic require() so Metro bundles them
export const PLANT_IMAGES: ImageSourcePropType[] = [
  require('../assets/output_colored_plants/plant_000.png'),
  require('../assets/output_colored_plants/plant_001.png'),
  require('../assets/output_colored_plants/plant_002.png'),
  require('../assets/output_colored_plants/plant_003.png'),
  require('../assets/output_colored_plants/plant_004.png'),
  require('../assets/output_colored_plants/plant_005.png'),
  require('../assets/output_colored_plants/plant_006.png'),
  require('../assets/output_colored_plants/plant_007.png'),
  require('../assets/output_colored_plants/plant_008.png'),
  require('../assets/output_colored_plants/plant_009.png'),
  require('../assets/output_colored_plants/plant_010.png'),
  require('../assets/output_colored_plants/plant_011.png'),
  require('../assets/output_colored_plants/plant_012.png'),
  require('../assets/output_colored_plants/plant_013.png'),
  require('../assets/output_colored_plants/plant_014.png'),
  require('../assets/output_colored_plants/plant_015.png'),
  require('../assets/output_colored_plants/plant_016.png'),
  require('../assets/output_colored_plants/plant_017.png'),
  require('../assets/output_colored_plants/plant_018.png'),
  require('../assets/output_colored_plants/plant_019.png'),
  require('../assets/output_colored_plants/plant_020.png'),
  require('../assets/output_colored_plants/plant_021.png'),
  require('../assets/output_colored_plants/plant_022.png'),
  require('../assets/output_colored_plants/plant_023.png'),
  require('../assets/output_colored_plants/plant_024.png'),
  require('../assets/output_colored_plants/plant_025.png'),
  require('../assets/output_colored_plants/plant_026.png'),
  require('../assets/output_colored_plants/plant_027.png'),
  require('../assets/output_colored_plants/plant_028.png'),
  require('../assets/output_colored_plants/plant_029.png'),
];

/**
 * Returns a deterministic plant image for a given date string ("YYYY-MM-DD").
 * Same date always yields the same plant — stable across app restarts.
 */
export function getPlantForDate(date: string): ImageSourcePropType {
  const idx = hashDate(date) % PLANT_COUNT;
  return PLANT_IMAGES[idx];
}

/**
 * Returns the plant index (0–29) for a given date.
 */
export function getPlantIndexForDate(date: string): number {
  return hashDate(date) % PLANT_COUNT;
}

// Simple djb2-style hash for a date string
function hashDate(date: string): number {
  let hash = 5381;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) + hash) ^ date.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash;
}
