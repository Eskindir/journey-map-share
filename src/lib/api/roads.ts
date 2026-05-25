/**
 * Google Roads API — snap GPS paths to the road network.
 */

import { config, debugLog } from '@/lib/config';
import { Position } from './types';

const MAX_PATH_POINTS = 100;
const MAX_CONTEXT_POINTS = 10;

interface SnappedPointLocation {
  latitude?: number;
  longitude?: number;
}

interface SnappedPoint {
  location?: SnappedPointLocation;
}

interface SnapToRoadsResponse {
  snappedPoints?: SnappedPoint[];
  warningMessage?: string;
}

function buildPathParam(positions: Position[]): string {
  return positions
    .map((p) => `${p.latitude},${p.longitude}`)
    .join('|');
}

/**
 * Snap GPS coordinates to the nearest road segments.
 * On failure or empty input, returns the input positions unchanged.
 */
export async function snapToRoads(positions: Position[]): Promise<Position[]> {
  if (positions.length === 0) {
    return [];
  }

  if (positions.length === 1) {
    const path = buildPathParam(positions);
    return snapPath(path, positions);
  }

  const trimmed =
    positions.length > MAX_PATH_POINTS
      ? positions.slice(-MAX_PATH_POINTS)
      : positions;

  const path = buildPathParam(trimmed);
  return snapPath(path, trimmed);
}

async function snapPath(
  path: string,
  fallback: Position[],
): Promise<Position[]> {
  if (!config.googleMaps.apiKey) {
    debugLog('snapToRoads: no API key, using raw positions');
    return fallback;
  }

  try {
    const url = new URL('https://roads.googleapis.com/v1/snapToRoads');
    url.searchParams.set('path', path);
    url.searchParams.set('interpolate', 'true');
    url.searchParams.set('key', config.googleMaps.apiKey);

    debugLog('snapToRoads request:', { pointCount: fallback.length });

    const response = await fetch(url.toString());

    if (!response.ok) {
      debugLog('snapToRoads HTTP error:', response.status);
      return fallback;
    }

    const data = (await response.json()) as SnapToRoadsResponse;

    if (data.warningMessage) {
      debugLog('snapToRoads warning:', data.warningMessage);
    }

    const snapped = data.snappedPoints;
    if (!snapped?.length) {
      debugLog('snapToRoads: no snapped points');
      return fallback;
    }

    const result: Position[] = snapped
      .map((point) => {
        const loc = point.location;
        if (
          loc?.latitude === undefined ||
          loc?.longitude === undefined
        ) {
          return null;
        }
        return {
          latitude: loc.latitude,
          longitude: loc.longitude,
        };
      })
      .filter((p): p is Position => p !== null);

    if (result.length === 0) {
      return fallback;
    }

    debugLog('snapToRoads success:', { in: fallback.length, out: result.length });
    return result;
  } catch (error) {
    debugLog('snapToRoads error:', error);
    return fallback;
  }
}

/**
 * Snap a new position using recent history for path context.
 * Returns the last snapped point (on-road estimate for the latest fix).
 */
export async function snapPositionWithHistory(
  history: Position[],
  newPosition: Position,
): Promise<Position> {
  const context = history.slice(-(MAX_CONTEXT_POINTS - 1));
  const path = [...context, newPosition];

  if (path.length === 1) {
    const snapped = await snapToRoads(path);
    return snapped[0] ?? newPosition;
  }

  const snapped = await snapToRoads(path);
  return snapped[snapped.length - 1] ?? newPosition;
}
