import { useState, useMemo, useCallback, RefObject } from 'react';
import type { Track } from '../contexts/TracksContext';
import type { TimeSelection } from '@audacity-ui/core';

// Constants for timeline layout
const LEFT_PADDING = 12; // pixels
const MIN_VIEWPORT_WIDTH = 5000; // Minimum starting width
const MAX_CANVAS_WIDTH = 32000; // Browser canvas limit safety
const MIN_ZOOM = 10; // Minimum pixels per second
const ZOOM_FACTOR = 1.5; // Multiplier for zoom in/out steps

export interface UseZoomControlsOptions {
  state: {
    tracks: Track[];
    timeSelection: TimeSelection | null;
  };
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  zoomToggleLevel1: string;
  zoomToggleLevel2: string;
}

export interface UseZoomControlsReturn {
  pixelsPerSecond: number;
  setPixelsPerSecond: (value: number | ((prev: number) => number)) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToSelection: () => void;
  zoomToFitProject: () => void;
  zoomToggle: () => void;
  timelineWidth: number;
  timelineDuration: number;
  maxPixelsPerSecond: number;
}

/**
 * Hook for managing zoom-related state and functions
 * Handles zoom in/out, zoom to selection, zoom to fit, and zoom toggle,
 * as well as computing timeline dimensions from project content.
 */
export function useZoomControls(options: UseZoomControlsOptions): UseZoomControlsReturn {
  const {
    state,
    scrollContainerRef,
    zoomToggleLevel1,
    zoomToggleLevel2,
  } = options;

  // Zoom state
  const [pixelsPerSecond, setPixelsPerSecond] = useState(100);

  // Calculate project length (end of last clip across all tracks)
  const projectLength = useMemo(() => {
    let maxEndTime = 0;
    state.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEndTime = clip.start + clip.duration;
        if (clipEndTime > maxEndTime) {
          maxEndTime = clipEndTime;
        }
      });
    });
    return maxEndTime;
  }, [state.tracks]);

  // Timeline duration: project length + 50% buffer, with minimum
  const timelineDuration = Math.max(10, projectLength * 1.5);

  // Calculate width in pixels
  const calculatedWidth = Math.ceil(timelineDuration * pixelsPerSecond) + LEFT_PADDING;

  // Apply constraints: min viewport width, max canvas width
  const timelineWidth = Math.max(
    MIN_VIEWPORT_WIDTH,
    Math.min(calculatedWidth, MAX_CANVAS_WIDTH)
  );

  // Calculate max pixels per second to stay under canvas limit
  const maxPixelsPerSecond = Math.floor((MAX_CANVAS_WIDTH - LEFT_PADDING) / timelineDuration);

  // Convert zoom level name to pixels per second
  const zoomLevelToPixelsPerSecond = useCallback((level: string): number => {
    switch (level) {
      case 'fit-to-width':
        // Calculate pixels per second to fit entire timeline in viewport
        // This would need the container width - using a reasonable default
        return 50; // Placeholder - should calculate based on container width
      case 'zoom-to-selection':
        // Would need selection info - fallback to current zoom
        return pixelsPerSecond;
      case 'zoom-default':
        return 100; // Default zoom level
      case 'minutes':
        return 20; // ~3 seconds per 60 pixels
      case 'seconds':
        return 100; // 1 second = 100 pixels
      case '5ths-of-seconds':
        return 200; // 0.2 seconds = 40 pixels
      case '10ths-of-seconds':
        return 300; // 0.1 seconds = 30 pixels
      case '20ths-of-seconds':
        return 400; // 0.05 seconds = 20 pixels
      case '50ths-of-seconds':
        return 600; // 0.02 seconds = 12 pixels
      case '100ths-of-seconds':
        return 1000; // 0.01 seconds = 10 pixels
      case '500ths-of-seconds':
        return 2000; // 0.002 seconds = 4 pixels
      case 'milliseconds':
        return 3000; // Very zoomed in
      case 'samples':
        return 4000; // Sample-level view
      case '4-pixels-per-sample':
        return 8000; // 4 pixels per sample (at 44.1kHz)
      case 'max-zoom':
        return maxPixelsPerSecond; // Maximum zoom
      default:
        return 100; // Fallback to default
    }
  }, [pixelsPerSecond, maxPixelsPerSecond]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setPixelsPerSecond(prev => Math.min(prev * ZOOM_FACTOR, maxPixelsPerSecond));
  }, [maxPixelsPerSecond]);

  const zoomOut = useCallback(() => {
    setPixelsPerSecond(prev => Math.max(prev / ZOOM_FACTOR, MIN_ZOOM));
  }, []);

  const zoomToggle = useCallback(() => {
    // Toggle between the two predefined zoom levels
    // Convert level names to pixel values
    const level1Pixels = zoomLevelToPixelsPerSecond(zoomToggleLevel1);
    const level2Pixels = zoomLevelToPixelsPerSecond(zoomToggleLevel2);

    // If both levels are the same, do nothing
    if (level1Pixels === level2Pixels) {
      return;
    }

    // If current zoom is closer to level 1, switch to level 2, otherwise switch to level 1
    setPixelsPerSecond(prev => {
      const distanceToLevel1 = Math.abs(prev - level1Pixels);
      const distanceToLevel2 = Math.abs(prev - level2Pixels);

      if (distanceToLevel1 < distanceToLevel2) {
        return level2Pixels;
      } else {
        return level1Pixels;
      }
    });
  }, [zoomLevelToPixelsPerSecond, zoomToggleLevel1, zoomToggleLevel2]);

  const zoomToSelection = useCallback(() => {
    if (!state.timeSelection) {
      return;
    }

    const selectionDuration = state.timeSelection.endTime - state.timeSelection.startTime;

    // Calculate pixels per second to fit the selection in the viewport (100% width)
    const viewportWidth = scrollContainerRef.current?.clientWidth || 800;
    const newPixelsPerSecond = Math.floor(viewportWidth / selectionDuration);

    // Apply zoom level constraints
    const constrainedZoom = Math.max(MIN_ZOOM, Math.min(newPixelsPerSecond, maxPixelsPerSecond));
    setPixelsPerSecond(constrainedZoom);

    // Scroll to show the selection at the left edge
    const scrollPosition = state.timeSelection.startTime * constrainedZoom;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [state.timeSelection, scrollContainerRef, maxPixelsPerSecond]);

  const zoomToFitProject = useCallback(() => {
    // Find the earliest start time and latest end time across all clips
    let projectStart = Infinity;
    let projectEnd = 0;

    state.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipStart = clip.start;
        const clipEnd = clip.start + clip.duration;
        projectStart = Math.min(projectStart, clipStart);
        projectEnd = Math.max(projectEnd, clipEnd);
      });
    });

    // If no clips found, show a message
    if (projectStart === Infinity || projectEnd === 0) {
      return;
    }

    const projectDuration = projectEnd - projectStart;

    console.log('Zoom to Fit:', {
      projectStart,
      projectEnd,
      projectDuration,
      viewportWidth: scrollContainerRef.current?.clientWidth,
    });

    // Calculate pixels per second to fit the entire project in the viewport
    // Use full viewport width
    const viewportWidth = scrollContainerRef.current?.clientWidth || 800;
    const newPixelsPerSecond = viewportWidth / projectDuration;

    console.log('Calculated zoom:', {
      newPixelsPerSecond,
      min: MIN_ZOOM,
      max: maxPixelsPerSecond,
    });

    // Apply zoom level constraints
    const constrainedZoom = Math.max(MIN_ZOOM, Math.min(newPixelsPerSecond, maxPixelsPerSecond));
    setPixelsPerSecond(constrainedZoom);

    // Scroll to the start of the project
    const scrollPosition = projectStart * constrainedZoom;

    console.log('Scroll position:', scrollPosition);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollPosition;
    }
  }, [state.tracks, scrollContainerRef, maxPixelsPerSecond]);

  return {
    pixelsPerSecond,
    setPixelsPerSecond,
    zoomIn,
    zoomOut,
    zoomToSelection,
    zoomToFitProject,
    zoomToggle,
    timelineWidth,
    timelineDuration,
    maxPixelsPerSecond,
  };
}
