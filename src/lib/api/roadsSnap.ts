/**
 * Google Roads API client
 *
 * Snaps a sparse sequence of raw GPS fixes onto the road network and, when
 * `interpolate=true`, returns extra points along the matched road geometry so
 * a polyline drawn between the returned points follows actual road curves
 * instead of cutting across them in straight chords.
 *
 * Docs: https://developers.google.com/maps/documentation/roads/snap
 */

import { z } from 'zod';
import { config, debugLog } from '@/lib/config';
import type { Position } from './types';

export interface SnappedPoint {
  latitude: number;
  longitude: number;
  /** Index into the original input path; undefined for interpolated points. */
  originalIndex?: number;
  placeId?: string;
}

const SnapToRoadsResponseSchema = z.object({
  snappedPoints: z
    .array(
      z.object({
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        originalIndex: z.number().int().nonnegative().optional(),
        placeId: z.string().optional(),
      }),
    )
    .optional(),
  warningMessage: z.string().optional(),
});

const SNAP_TO_ROADS_URL = 'https://roads.googleapis.com/v1/snapToRoads';
const MAX_PATH_POINTS = 100;

/**
 * Snap an ordered path of raw GPS fixes onto the road network.
 *
 * On any failure (network error, API error, schema mismatch) this returns the
 * input path unchanged — wrapped as `SnappedPoint`s with their `originalIndex`
 * set — so callers never have to special-case the error path. The tracker
 * degrades to today's behavior instead of freezing.
 */
export async function snapToRoads(
  path: Position[],
  interpolate: boolean,
): Promise<SnappedPoint[]> {
  if (path.length === 0) return [];

  const inputAsSnapped: SnappedPoint[] = path.map((p, i) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    originalIndex: i,
  }));

  if (path.length > MAX_PATH_POINTS) {
    debugLog(
      `snapToRoads: path has ${path.length} points, exceeding cap of ${MAX_PATH_POINTS}; passing through unchanged`,
    );
    return inputAsSnapped;
  }

  try {
    const url = new URL(SNAP_TO_ROADS_URL);
    url.searchParams.set('interpolate', String(interpolate));
    url.searchParams.set(
      'path',
      path.map((p) => `${p.latitude},${p.longitude}`).join('|'),
    );
    url.searchParams.set('key', config.googleMaps.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      debugLog('snapToRoads request failed:', response.status);
      return inputAsSnapped;
    }

    const data = await response.json();
    const parsed = SnapToRoadsResponseSchema.safeParse(data);

    if (!parsed.success) {
      debugLog('snapToRoads response validation failed:', parsed.error);
      return inputAsSnapped;
    }

    const snapped = parsed.data.snappedPoints ?? [];
    if (snapped.length === 0) {
      debugLog('snapToRoads returned no points; passing through');
      return inputAsSnapped;
    }

    return snapped.map((s) => ({
      latitude: s.location.latitude,
      longitude: s.location.longitude,
      originalIndex: s.originalIndex,
      placeId: s.placeId,
    }));
  } catch (err) {
    debugLog('snapToRoads error:', err);
    return inputAsSnapped;
  }
}
