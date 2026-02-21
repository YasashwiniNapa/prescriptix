/**
 * ML API Client
 * Integration layer for external FastAPI ML backend.
 * All endpoints are stubbed and ready for connection.
 */

import { FeatureVector } from './feature-engineering';
import { RiskCategory } from './risk-scoring';

export interface MLPredictionResponse {
  probability: number;
  category: RiskCategory;
  model: string;
  calibrated: boolean;
}

export interface MLTrainingResponse {
  modelVersion: string;
  accuracy: number;
  rocAuc: number;
  sensitivity: number;
  specificity: number;
}

export interface MLMetrics {
  modelVersion: string;
  accuracy: number;
  rocAuc: number;
  sensitivity: number;
  specificity: number;
  confusionMatrix: number[][];
  trainingDate: string;
}

// Configure this to point at your FastAPI backend
let baseUrl = '';

export function setMLApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, '');
}

export function getMLApiBaseUrl(): string {
  return baseUrl;
}

export function isMLBackendConfigured(): boolean {
  return baseUrl.length > 0;
}

/**
 * POST /predict — single feature vector prediction
 */
export async function predict(featureVector: FeatureVector): Promise<MLPredictionResponse> {
  if (!baseUrl) throw new Error('ML backend not configured. Call setMLApiBaseUrl() first.');

  const res = await fetch(`${baseUrl}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features: featureVector.values, labels: featureVector.labels }),
  });

  if (!res.ok) throw new Error(`ML predict failed: ${res.status}`);
  return res.json();
}

/**
 * POST /predict_video — feature vectors from video frames
 */
export async function predictVideo(featureVectors: FeatureVector[]): Promise<MLPredictionResponse> {
  if (!baseUrl) throw new Error('ML backend not configured.');

  const res = await fetch(`${baseUrl}/predict_video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frames: featureVectors.map(fv => ({ features: fv.values, labels: fv.labels })),
    }),
  });

  if (!res.ok) throw new Error(`ML predict_video failed: ${res.status}`);
  return res.json();
}

/**
 * POST /train — trigger model training
 */
export async function train(datasetPath: string): Promise<MLTrainingResponse> {
  if (!baseUrl) throw new Error('ML backend not configured.');

  const res = await fetch(`${baseUrl}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_path: datasetPath }),
  });

  if (!res.ok) throw new Error(`ML train failed: ${res.status}`);
  return res.json();
}

/**
 * GET /metrics — retrieve latest model metrics
 */
export async function getMetrics(): Promise<MLMetrics> {
  if (!baseUrl) throw new Error('ML backend not configured.');

  const res = await fetch(`${baseUrl}/metrics`);
  if (!res.ok) throw new Error(`ML metrics failed: ${res.status}`);
  return res.json();
}
