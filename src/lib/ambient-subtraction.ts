/**
 * Ambient Subtraction Module
 * 
 * Captures two frames: one with device screen flash (pure white illumination)
 * and one without (ambient room light only). Subtracting ambient from flash
 * yields the true tissue reflectance, independent of room lighting.
 */

export interface AmbientSubtractionFrames {
  ambientData: ImageData;
  flashData: ImageData;
}

/**
 * Capture ambient + flash frames from a video element.
 * 
 * 1. Capture ambient frame (current room lighting)
 * 2. Flash screen pure white at max brightness
 * 3. Wait for screen to stabilize (~300ms)
 * 4. Capture flash frame
 * 5. Return both frames for subtraction
 * 
 * @param video - The video element with the camera stream
 * @param flashOverlay - A div element to use as the flash overlay
 * @returns The ambient and flash ImageData
 */
export async function captureAmbientSubtractionFrames(
  video: HTMLVideoElement,
  flashOverlay: HTMLDivElement,
): Promise<AmbientSubtractionFrames> {
  const canvas = document.createElement('canvas');
  const w = video.videoWidth || video.clientWidth;
  const h = video.videoHeight || video.clientHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Capture ambient frame (current room lighting)
  ctx.drawImage(video, 0, 0, w, h);
  const ambientData = ctx.getImageData(0, 0, w, h);

  // 2. Trigger flash (pure white screen)
  flashOverlay.style.opacity = '1';
  flashOverlay.style.backgroundColor = '#ffffff';

  // 3. Wait for hardware to hit max brightness
  await new Promise(resolve => setTimeout(resolve, 300));

  // 4. Capture flash frame
  ctx.drawImage(video, 0, 0, w, h);
  const flashData = ctx.getImageData(0, 0, w, h);

  // 5. Turn off flash
  flashOverlay.style.opacity = '0';

  return { ambientData, flashData };
}

/**
 * Perform pixel-wise ambient subtraction.
 * Result = clamp(flash - ambient, 0, 255)
 * This removes room lighting contribution, leaving true tissue reflectance.
 */
export function subtractFrames(
  flashData: ImageData,
  ambientData: ImageData,
): ImageData {
  const w = flashData.width;
  const h = flashData.height;
  const result = new ImageData(w, h);

  for (let i = 0; i < flashData.data.length; i += 4) {
    // Subtract ambient from flash for R, G, B channels
    result.data[i] = Math.max(0, flashData.data[i] - ambientData.data[i]);         // R
    result.data[i + 1] = Math.max(0, flashData.data[i + 1] - ambientData.data[i + 1]); // G
    result.data[i + 2] = Math.max(0, flashData.data[i + 2] - ambientData.data[i + 2]); // B
    result.data[i + 3] = 255; // Alpha
  }

  return result;
}
