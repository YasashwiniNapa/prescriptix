/**
 * Feature Engineering Module
 * Computes symmetry features from 468 MediaPipe landmarks.
 * All features are normalized relative to face width to avoid scale bias.
 */

import { LandmarkFrame, LandmarkPoint, LANDMARK_INDICES as LM } from './landmark-service';

export interface SymmetryFeatures {
  /** Left vs right lip corner vertical displacement (normalized) */
  lipCornerAsymmetry: number;
  /** Smile angle difference (degrees) */
  smileAngleAsymmetry: number;
  /** Eye aperture ratio: left EAR / right EAR */
  eyeApertureRatio: number;
  /** Left EAR value */
  earLeft: number;
  /** Right EAR value */
  earRight: number;
  /** Brow height delta (left - right, normalized) */
  browHeightDelta: number;
  /** Jawline midline deviation (nose tip to chin offset, normalized) */
  jawlineDeviation: number;
  /** Midface symmetry score (0 = perfect symmetry, higher = more asymmetric) */
  midfaceSymmetryScore: number;
  /** Overall composite asymmetry score (0-1) */
  compositeScore: number;
}

export interface AggregatedFeatures {
  mean: SymmetryFeatures;
  variance: SymmetryFeatures;
  maxDeviation: SymmetryFeatures;
  frameCount: number;
}

/** Feature vector for ML classification */
export interface FeatureVector {
  values: number[];
  labels: string[];
}

// ── Helpers ──

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function dist3d(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/** Face width for normalization (distance between temples) */
function faceWidth(landmarks: LandmarkPoint[]): number {
  return dist(landmarks[LM.leftTemple], landmarks[LM.rightTemple]) || 0.001;
}

/** Eye Aspect Ratio = (top-bottom distance) / (inner-outer distance) */
function computeEAR(
  top: LandmarkPoint, bottom: LandmarkPoint,
  inner: LandmarkPoint, outer: LandmarkPoint,
): number {
  const vertical = dist(top, bottom);
  const horizontal = dist(inner, outer);
  return horizontal > 0 ? vertical / horizontal : 0;
}

/** Angle of a line from horizontal (degrees) */
function angleFromHorizontal(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

// ── Core Feature Extraction ──

export function extractSymmetryFeatures(landmarks: LandmarkPoint[]): SymmetryFeatures {
  if (landmarks.length < 468) {
    return emptyFeatures();
  }

  const fw = faceWidth(landmarks);

  // 1. Lip corner asymmetry (vertical displacement difference)
  const lipLeftY = landmarks[LM.lipLeftCorner].y;
  const lipRightY = landmarks[LM.lipRightCorner].y;
  const lipCornerAsymmetry = Math.abs(lipLeftY - lipRightY) / fw;

  // 2. Smile angle asymmetry
  const lipCenter = {
    x: (landmarks[LM.lipTop].x + landmarks[LM.lipBottom].x) / 2,
    y: (landmarks[LM.lipTop].y + landmarks[LM.lipBottom].y) / 2,
    z: 0,
  };
  const leftAngle = angleFromHorizontal(lipCenter, landmarks[LM.lipLeftCorner]);
  const rightAngle = angleFromHorizontal(lipCenter, landmarks[LM.lipRightCorner]);
  const smileAngleAsymmetry = Math.abs(Math.abs(leftAngle) - Math.abs(rightAngle));

  // 3. Eye aperture ratio
  const earLeft = computeEAR(
    landmarks[LM.leftEyeTop], landmarks[LM.leftEyeBottom],
    landmarks[LM.leftEyeInner], landmarks[LM.leftEyeOuter],
  );
  const earRight = computeEAR(
    landmarks[LM.rightEyeTop], landmarks[LM.rightEyeBottom],
    landmarks[LM.rightEyeInner], landmarks[LM.rightEyeOuter],
  );
  const eyeApertureRatio = earRight > 0 ? earLeft / earRight : 1;

  // 4. Brow height delta
  const leftBrowH = Math.abs(landmarks[LM.leftBrowCenter].y - landmarks[LM.leftEyeTop].y);
  const rightBrowH = Math.abs(landmarks[LM.rightBrowCenter].y - landmarks[LM.rightEyeTop].y);
  const browHeightDelta = (leftBrowH - rightBrowH) / fw;

  // 5. Jawline deviation from midline
  const noseTipX = landmarks[LM.noseTip].x;
  const chinX = landmarks[LM.chin].x;
  const jawlineDeviation = Math.abs(noseTipX - chinX) / fw;

  // 6. Midface symmetry (compare mirrored landmark pairs)
  const pairs: [number, number][] = [
    [LM.leftCheek, LM.rightCheek],
    [LM.leftTemple, LM.rightTemple],
    [LM.jawLeft, LM.jawRight],
    [LM.jawLeftMid, LM.jawRightMid],
    [LM.leftBrowOuter, LM.rightBrowOuter],
    [LM.leftEyeOuter, LM.rightEyeOuter],
  ];
  const midlineX = landmarks[LM.noseTip].x;
  let symmetrySum = 0;
  for (const [li, ri] of pairs) {
    const leftDist = Math.abs(landmarks[li].x - midlineX);
    const rightDist = Math.abs(landmarks[ri].x - midlineX);
    const leftY = landmarks[li].y;
    const rightY = landmarks[ri].y;
    symmetrySum += Math.abs(leftDist - rightDist) / fw;
    symmetrySum += Math.abs(leftY - rightY) / fw;
  }
  const midfaceSymmetryScore = symmetrySum / (pairs.length * 2);

  // 7. Composite score (weighted blend)
  const compositeScore = Math.min(1, (
    lipCornerAsymmetry * 2.5 +
    smileAngleAsymmetry / 30 +
    Math.abs(1 - eyeApertureRatio) * 2 +
    Math.abs(browHeightDelta) * 3 +
    jawlineDeviation * 4 +
    midfaceSymmetryScore * 5
  ) / 6);

  return {
    lipCornerAsymmetry,
    smileAngleAsymmetry,
    eyeApertureRatio,
    earLeft,
    earRight,
    browHeightDelta,
    jawlineDeviation,
    midfaceSymmetryScore,
    compositeScore,
  };
}

function emptyFeatures(): SymmetryFeatures {
  return {
    lipCornerAsymmetry: 0, smileAngleAsymmetry: 0, eyeApertureRatio: 1,
    earLeft: 0, earRight: 0, browHeightDelta: 0, jawlineDeviation: 0,
    midfaceSymmetryScore: 0, compositeScore: 0,
  };
}

// ── Aggregation across frames ──

export function aggregateFeatures(frames: SymmetryFeatures[]): AggregatedFeatures {
  if (frames.length === 0) {
    return { mean: emptyFeatures(), variance: emptyFeatures(), maxDeviation: emptyFeatures(), frameCount: 0 };
  }

  const keys = Object.keys(frames[0]) as (keyof SymmetryFeatures)[];
  const mean = { ...emptyFeatures() };
  const variance = { ...emptyFeatures() };
  const maxDeviation = { ...emptyFeatures() };

  // Compute mean
  for (const key of keys) {
    const values = frames.map(f => f[key]);
    mean[key] = values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Compute variance and max deviation
  for (const key of keys) {
    const values = frames.map(f => f[key]);
    variance[key] = values.reduce((sum, v) => sum + (v - mean[key]) ** 2, 0) / values.length;
    maxDeviation[key] = Math.max(...values.map(v => Math.abs(v - mean[key])));
  }

  return { mean, variance, maxDeviation, frameCount: frames.length };
}

// ── Feature Vector for ML ──

export function toFeatureVector(agg: AggregatedFeatures): FeatureVector {
  const labels: string[] = [];
  const values: number[] = [];

  const keys: (keyof SymmetryFeatures)[] = [
    'lipCornerAsymmetry', 'smileAngleAsymmetry', 'eyeApertureRatio',
    'earLeft', 'earRight', 'browHeightDelta', 'jawlineDeviation',
    'midfaceSymmetryScore', 'compositeScore',
  ];

  for (const key of keys) {
    labels.push(`mean_${key}`);
    values.push(agg.mean[key]);
    labels.push(`var_${key}`);
    values.push(agg.variance[key]);
    labels.push(`maxDev_${key}`);
    values.push(agg.maxDeviation[key]);
  }

  return { labels, values };
}
