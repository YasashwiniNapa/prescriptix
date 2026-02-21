/**
 * Landmark Extraction Service
 * Wraps MediaPipe Face Mesh for real-time 468-landmark extraction.
 * Works with both live camera streams and uploaded video files.
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface LandmarkFrame {
  landmarks: LandmarkPoint[];
  confidence: number;
  timestamp: number;
}

// MediaPipe Face Mesh key landmark indices
export const LANDMARK_INDICES = {
  // Lips
  lipLeftCorner: 61,
  lipRightCorner: 291,
  lipTop: 13,
  lipBottom: 14,
  lipLeftUpper: 40,
  lipRightUpper: 270,
  lipLeftLower: 88,
  lipRightLower: 318,

  // Eyes
  leftEyeTop: 159,
  leftEyeBottom: 145,
  leftEyeInner: 133,
  leftEyeOuter: 33,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  rightEyeInner: 362,
  rightEyeOuter: 263,

  // Eyebrows
  leftBrowCenter: 105,
  rightBrowCenter: 334,
  leftBrowInner: 107,
  rightBrowInner: 336,
  leftBrowOuter: 70,
  rightBrowOuter: 300,

  // Nose & midline
  noseTip: 1,
  noseBridge: 6,
  noseBottom: 2,

  // Chin & jaw
  chin: 152,
  jawLeft: 234,
  jawRight: 454,
  jawLeftMid: 172,
  jawRightMid: 397,

  // Midface reference points (for symmetry)
  foreheadCenter: 10,
  leftCheek: 123,
  rightCheek: 352,
  leftTemple: 127,
  rightTemple: 356,
} as const;

/**
 * Creates and initializes a MediaPipe FaceMesh instance.
 * Returns an object with methods to process frames.
 */
export async function createLandmarkExtractor() {
  // Dynamic import for MediaPipe (works with bundler)
  const { FaceMesh } = await import('@mediapipe/face_mesh');

  const faceMesh = new FaceMesh({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let latestFrame: LandmarkFrame | null = null;
  let onFrameCallback: ((frame: LandmarkFrame) => void) | null = null;

  faceMesh.onResults((results: any) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const raw = results.multiFaceLandmarks[0];
      const frame: LandmarkFrame = {
        landmarks: raw.map((lm: any) => ({ x: lm.x, y: lm.y, z: lm.z })),
        confidence: raw.length === 468 ? 0.95 : 0.7,
        timestamp: Date.now(),
      };
      latestFrame = frame;
      onFrameCallback?.(frame);
    }
  });

  return {
    /** Process a single video element frame */
    async processVideoFrame(video: HTMLVideoElement): Promise<LandmarkFrame | null> {
      await faceMesh.send({ image: video });
      return latestFrame;
    },

    /** Process a canvas/image element */
    async processImage(image: HTMLCanvasElement | HTMLImageElement): Promise<LandmarkFrame | null> {
      await faceMesh.send({ image });
      return latestFrame;
    },

    /** Subscribe to frame results */
    onFrame(cb: (frame: LandmarkFrame) => void) {
      onFrameCallback = cb;
    },

    /** Close and release resources */
    close() {
      faceMesh.close();
      onFrameCallback = null;
    },
  };
}

/**
 * Extract landmark frames from an uploaded video file.
 * Processes frames at ~5fps for efficiency.
 */
export async function extractLandmarksFromVideo(
  videoFile: File,
  onProgress?: (pct: number) => void,
  targetFps = 5,
): Promise<LandmarkFrame[]> {
  const extractor = await createLandmarkExtractor();
  const frames: LandmarkFrame[] = [];

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;

  const url = URL.createObjectURL(videoFile);
  video.src = url;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  const duration = video.duration;
  const frameInterval = 1 / targetFps;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;

  let currentTime = 0;
  const totalFrames = Math.ceil(duration * targetFps);

  while (currentTime < duration) {
    video.currentTime = currentTime;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    ctx.drawImage(video, 0, 0);
    const frame = await extractor.processImage(canvas);
    if (frame) {
      frames.push({ ...frame, timestamp: currentTime * 1000 });
    }

    currentTime += frameInterval;
    onProgress?.(Math.min((frames.length / totalFrames) * 100, 99));
  }

  extractor.close();
  URL.revokeObjectURL(url);
  onProgress?.(100);

  return frames;
}
