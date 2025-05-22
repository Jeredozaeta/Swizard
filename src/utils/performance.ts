import { detect } from 'detect-browser';

export interface PerformanceProfile {
  targetFPS: number;
  resolution: number;
  useOffscreen: boolean;
  smoothing: boolean;
  interpolation: boolean;
}

export const getPerformanceProfile = (): PerformanceProfile => {
  const browser = detect();
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 4;

  // Default high-performance profile
  const highPerformance: PerformanceProfile = {
    targetFPS: 60,
    resolution: 1,
    useOffscreen: true,
    smoothing: true,
    interpolation: true
  };

  // Medium performance profile
  const mediumPerformance: PerformanceProfile = {
    targetFPS: 30,
    resolution: 0.75,
    useOffscreen: true,
    smoothing: true,
    interpolation: false
  };

  // Low performance profile
  const lowPerformance: PerformanceProfile = {
    targetFPS: 24,
    resolution: 0.5,
    useOffscreen: false,
    smoothing: false,
    interpolation: false
  };

  // Determine performance profile based on browser and device
  if (isMobile || isLowEnd) {
    return lowPerformance;
  }

  if (browser) {
    switch (browser.name) {
      case 'chrome':
        return highPerformance;
      case 'firefox':
        return mediumPerformance;
      case 'safari':
        return {
          ...mediumPerformance,
          useOffscreen: false // Safari doesn't support OffscreenCanvas well
        };
      default:
        return mediumPerformance;
    }
  }

  return mediumPerformance;
};

export const measurePerformance = () => {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 0;

  const update = () => {
    const now = performance.now();
    frameCount++;

    if (now >= lastTime + 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }

    return fps;
  };

  return update;
};