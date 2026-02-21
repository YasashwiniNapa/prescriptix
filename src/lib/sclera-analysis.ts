/**
 * Sclera Yellowness Analysis
 * 
 * Detects jaundice/yellowness by isolating the sclera (whites of the eyes)
 * using MediaPipe landmarks, then analyzing color in CIE L*a*b* space.
 * 
 * Key principles:
 * - Sclera contains zero melanin → race-agnostic tissue
 * - CIE L*a*b* separates lightness from color → shadow-invariant
 * - b* channel = blue-to-yellow axis → direct yellowness measurement
 * - Blue chromaticity B/(R+G+B) as lightweight alternative
 */

import { LandmarkPoint, LANDMARK_INDICES as LM } from './landmark-service';

export interface ScleraYellownessResult {
  /** CIE L*a*b* b-channel yellowness (0 = neutral, higher = more yellow) */
  labYellowness: number;
  /** Blue chromaticity score (lower = more yellow, healthy ~0.28-0.33) */
  blueChromaticity: number;
  /** Average across both eyes */
  meanYellowness: number;
  /** Left eye yellowness */
  leftEyeYellowness: number;
  /** Right eye yellowness */
  rightEyeYellowness: number;
  /** Whether yellowness exceeds clinical threshold */
  yellownessDetected: boolean;
  /** Confidence based on sample size */
  confidence: number;
}

// MediaPipe eye contour landmark indices for sclera isolation
// These form the polygon around each eye's visible white area
const LEFT_EYE_CONTOUR = [
  33, 7, 163, 144, 145, 153, 154, 155, 133,
  173, 157, 158, 159, 160, 161, 246,
];
const RIGHT_EYE_CONTOUR = [
  362, 382, 381, 380, 374, 373, 390, 249, 263,
  466, 388, 387, 386, 385, 384, 398,
];

// Iris landmark indices (to exclude from sclera)
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];

/**
 * Extract sclera pixel data from a video frame using MediaPipe landmarks.
 * Returns ImageData of pixels within the sclera polygon (excluding iris).
 */
export function extractScleraPixels(
  video: HTMLVideoElement,
  landmarks: LandmarkPoint[],
  canvas: HTMLCanvasElement,
): { leftPixels: Uint8ClampedArray; rightPixels: Uint8ClampedArray; totalSamples: number } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const w = video.videoWidth || video.clientWidth;
  const h = video.videoHeight || video.clientHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);

  const leftPixels = extractEyeScleraPixels(imageData, landmarks, LEFT_EYE_CONTOUR, LEFT_IRIS, w, h);
  const rightPixels = extractEyeScleraPixels(imageData, landmarks, RIGHT_EYE_CONTOUR, RIGHT_IRIS, w, h);

  return {
    leftPixels,
    rightPixels,
    totalSamples: leftPixels.length / 4 + rightPixels.length / 4,
  };
}

function extractEyeScleraPixels(
  imageData: ImageData,
  landmarks: LandmarkPoint[],
  contourIndices: number[],
  irisIndices: number[],
  w: number,
  h: number,
): Uint8ClampedArray {
  // Build eye contour polygon
  const contour = contourIndices
    .filter(i => i < landmarks.length)
    .map(i => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));

  // Build iris polygon (to exclude)
  const iris = irisIndices
    .filter(i => i < landmarks.length)
    .map(i => ({ x: landmarks[i].x * w, y: landmarks[i].y * h }));

  if (contour.length < 6) return new Uint8ClampedArray(0);

  // Get bounding box of eye contour
  const minX = Math.max(0, Math.floor(Math.min(...contour.map(p => p.x))) - 2);
  const maxX = Math.min(w - 1, Math.ceil(Math.max(...contour.map(p => p.x))) + 2);
  const minY = Math.max(0, Math.floor(Math.min(...contour.map(p => p.y))) - 2);
  const maxY = Math.min(h - 1, Math.ceil(Math.max(...contour.map(p => p.y))) + 2);

  const pixels: number[] = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon(x, y, contour) && (iris.length < 4 || !pointInPolygon(x, y, iris))) {
        const idx = (y * w + x) * 4;
        pixels.push(
          imageData.data[idx],     // R
          imageData.data[idx + 1], // G
          imageData.data[idx + 2], // B
          imageData.data[idx + 3], // A
        );
      }
    }
  }

  return new Uint8ClampedArray(pixels);
}

/** Ray-casting point-in-polygon test */
function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── CIE L*a*b* Conversion ──

/** Convert sRGB [0-255] to linear RGB [0-1] */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Convert linear RGB to CIE XYZ (D65 illuminant) */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750,
    lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041,
  ];
}

/** CIE Lab helper function */
function labF(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

/** Convert XYZ to CIE L*a*b* (D65 reference white) */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white
  const xn = 0.95047, yn = 1.00000, zn = 1.08883;
  const fx = labF(x / xn);
  const fy = labF(y / yn);
  const fz = labF(z / zn);
  return [
    116 * fy - 16,        // L*
    500 * (fx - fy),      // a*
    200 * (fy - fz),      // b* (negative=blue, positive=yellow)
  ];
}

/** Convert RGB pixel to CIE L*a*b* b-channel value */
function rgbToLabB(r: number, g: number, b: number): number {
  const [x, y, z] = rgbToXyz(r, g, b);
  const [, , bStar] = xyzToLab(x, y, z);
  return bStar;
}

// ── Analysis Functions ──

/**
 * Compute yellowness from pixel data using CIE L*a*b* b-channel.
 * Returns average b* value (positive = yellow, negative = blue).
 */
export function computeLabYellowness(pixels: Uint8ClampedArray): number {
  if (pixels.length < 4) return 0;
  
  let bSum = 0;
  const count = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    bSum += rgbToLabB(pixels[i], pixels[i + 1], pixels[i + 2]);
  }

  return Math.max(0, bSum / count); // Clamp to positive (yellow direction)
}

/**
 * Compute blue chromaticity: B / (R + G + B)
 * Lower values indicate more yellowness.
 * Healthy sclera: ~0.28-0.33, Jaundiced: <0.25
 */
export function computeBlueChromaticity(pixels: Uint8ClampedArray): number {
  if (pixels.length < 4) return 0.33;

  let totalB = 0;
  let totalSum = 0;
  const count = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const sum = r + g + b;
    if (sum > 30) { // Skip near-black pixels (shadow/eyelash)
      totalB += b;
      totalSum += sum;
    }
  }

  return totalSum > 0 ? totalB / totalSum : 0.33;
}

/**
 * Perform ambient subtraction on two pixel arrays.
 * Returns the pure tissue reflectance (flash - ambient), clamped to [0, 255].
 */
export function ambientSubtract(
  flashPixels: Uint8ClampedArray,
  ambientPixels: Uint8ClampedArray,
): Uint8ClampedArray {
  const len = Math.min(flashPixels.length, ambientPixels.length);
  const result = new Uint8ClampedArray(len);

  for (let i = 0; i < len; i++) {
    // Skip alpha channel
    if (i % 4 === 3) {
      result[i] = 255;
    } else {
      result[i] = Math.max(0, flashPixels[i] - ambientPixels[i]);
    }
  }

  return result;
}

/**
 * Full sclera yellowness analysis pipeline.
 * Analyzes raw sclera pixels and returns comprehensive yellowness metrics.
 */
export function analyzeScleraYellowness(
  leftPixels: Uint8ClampedArray,
  rightPixels: Uint8ClampedArray,
): ScleraYellownessResult {
  const leftYellowness = computeLabYellowness(leftPixels);
  const rightYellowness = computeLabYellowness(rightPixels);
  const meanYellowness = (leftYellowness + rightYellowness) / 2;

  const leftBC = computeBlueChromaticity(leftPixels);
  const rightBC = computeBlueChromaticity(rightPixels);
  const meanBC = (leftBC + rightBC) / 2;

  const totalSamples = leftPixels.length / 4 + rightPixels.length / 4;

  // Yellowness thresholds based on CIE L*a*b* b-channel
  // Normal sclera b* ≈ 5-15, mild jaundice ≈ 15-25, moderate ≈ 25+
  const yellownessDetected = meanYellowness > 18 || meanBC < 0.24;

  return {
    labYellowness: meanYellowness,
    blueChromaticity: meanBC,
    meanYellowness,
    leftEyeYellowness: leftYellowness,
    rightEyeYellowness: rightYellowness,
    yellownessDetected,
    confidence: Math.min(1, totalSamples / 200), // Need ~200 sclera pixels for confidence
  };
}
