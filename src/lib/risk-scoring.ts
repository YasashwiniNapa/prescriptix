/**
 * Risk Scoring & Configuration Module
 * Maps asymmetry features to triage risk categories.
 * Uses configurable thresholds — can be swapped for ML inference later.
 */

import { SymmetryFeatures, AggregatedFeatures } from './feature-engineering';

export type RiskCategory = 'low' | 'moderate' | 'high';

export interface RiskThresholds {
  /** Composite score above which = moderate risk */
  moderateThreshold: number;
  /** Composite score above which = high risk */
  highThreshold: number;
}

export interface RiskResult {
  category: RiskCategory;
  probability: number;
  compositeScore: number;
  details: {
    label: string;
    value: number;
    status: 'normal' | 'warning' | 'alert';
  }[];
  disclaimer: string;
}

const DISCLAIMER =
  'This tool provides asymmetry risk screening only and is not a medical diagnosis. ' +
  'Always consult a qualified healthcare provider for clinical decisions.';

// Default thresholds (configurable)
const DEFAULT_THRESHOLDS: RiskThresholds = {
  moderateThreshold: 0.15,
  highThreshold: 0.35,
};

let currentThresholds: RiskThresholds = { ...DEFAULT_THRESHOLDS };

export function setThresholds(t: Partial<RiskThresholds>) {
  currentThresholds = { ...currentThresholds, ...t };
}

export function getThresholds(): RiskThresholds {
  return { ...currentThresholds };
}

/**
 * Score a single frame's features
 */
export function scoreFrame(features: SymmetryFeatures): RiskResult {
  return buildResult(features.compositeScore, features);
}

/**
 * Score aggregated features from multiple frames
 */
export function scoreAggregated(agg: AggregatedFeatures): RiskResult {
  return buildResult(agg.mean.compositeScore, agg.mean);
}

// internal helper to build a normalized risk result
function buildResult(composite: number, features: SymmetryFeatures): RiskResult {
  const { moderateThreshold, highThreshold } = currentThresholds;

  let category: RiskCategory = 'low';
  if (composite >= highThreshold) category = 'high';
  else if (composite >= moderateThreshold) category = 'moderate';

  // Convert composite to 0-1 probability (sigmoid-like mapping)
  const probability = 1 / (1 + Math.exp(-10 * (composite - (moderateThreshold + highThreshold) / 2)));

  const detailThresholds = {
    lipCorner: { warn: 0.02, alert: 0.05 },
    smileAngle: { warn: 5, alert: 12 },
    eyeRatio: { warn: 0.15, alert: 0.3 },
    browHeight: { warn: 0.015, alert: 0.04 },
    jawline: { warn: 0.015, alert: 0.04 },
    midface: { warn: 0.01, alert: 0.03 },
  };

  const status = (val: number, t: { warn: number; alert: number }): 'normal' | 'warning' | 'alert' => {
    if (val >= t.alert) return 'alert';
    if (val >= t.warn) return 'warning';
    return 'normal';
  };

  const details = [
    { label: 'Lip Corner Asymmetry', value: features.lipCornerAsymmetry, status: status(features.lipCornerAsymmetry, detailThresholds.lipCorner) },
    { label: 'Smile Angle Asymmetry', value: features.smileAngleAsymmetry, status: status(features.smileAngleAsymmetry, detailThresholds.smileAngle) },
    { label: 'Eye Aperture Ratio', value: Math.abs(1 - features.eyeApertureRatio), status: status(Math.abs(1 - features.eyeApertureRatio), detailThresholds.eyeRatio) },
    { label: 'Brow Height Delta', value: Math.abs(features.browHeightDelta), status: status(Math.abs(features.browHeightDelta), detailThresholds.browHeight) },
    { label: 'Jawline Deviation', value: features.jawlineDeviation, status: status(features.jawlineDeviation, detailThresholds.jawline) },
    { label: 'Midface Symmetry', value: features.midfaceSymmetryScore, status: status(features.midfaceSymmetryScore, detailThresholds.midface) },
  ];

  return {
    category,
    probability,
    compositeScore: composite,
    details,
    disclaimer: DISCLAIMER,
  };
}
