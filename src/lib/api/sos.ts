/**
 * SOS Emergency API Service
 *
 * Provides type-safe methods for SOS emergency operations.
 * Used when a driver triggers an emergency alert.
 */

import { apiPost, apiGet } from './client';
import {
  CreateSOSRequest,
  CreateSOSResponseSchema,
  SOSStatusResponse,
  SOSStatusResponseSchema,
  AddSOSGeolocationRequest,
  Position,
} from './types';
import { debugLog } from '@/lib/config';

/**
 * Result of creating an SOS alert
 */
export interface CreateSOSResult {
  sosId: string;
  message: string;
}

/**
 * Result of polling SOS status
 */
export interface SOSStatusResult {
  sosId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverPlateNumber: string;
  vehicleModel: string;
  driverPosition: Position;
  isActive: boolean;
  createdAt: string;
}

/**
 * Create a new SOS emergency alert
 */
export async function createSOS(
  request: CreateSOSRequest
): Promise<CreateSOSResult> {
  debugLog('Creating SOS alert:', request);

  const response = await apiPost<unknown>('/sos', request);

  const parseResult = CreateSOSResponseSchema.safeParse(response);

  if (!parseResult.success) {
    debugLog('SOS response validation warning:', parseResult.error);
  }

  const validated = parseResult.success
    ? parseResult.data
    : { sosId: '', message: '' };

  // Defensive extraction if schema didn't capture sosId
  let sosId = validated.sosId;
  if (!sosId && response && typeof response === 'object') {
    const raw = response as Record<string, unknown>;
    sosId = (raw.sosId ?? raw.SosId ?? raw.id ?? raw.Id ?? '') as string;
  }

  debugLog('SOS created:', { sosId });

  return {
    sosId,
    message: validated.message,
  };
}

/**
 * Poll SOS status to get latest driver position and info
 */
export async function getSOSStatus(
  sosId: string
): Promise<SOSStatusResult | null> {
  debugLog('Polling SOS status for:', sosId);

  try {
    const response = await apiGet<unknown>(`/sos/${sosId}`);

    const parseResult = SOSStatusResponseSchema.safeParse(response);

    if (!parseResult.success) {
      debugLog('SOS status validation warning:', parseResult.error);

      // Manual fallback extraction for PascalCase
      if (response && typeof response === 'object') {
        const raw = response as Record<string, unknown>;
        const pos = (raw.driverPosition ?? raw.DriverPosition ?? raw.position ?? raw.Position ?? {}) as Record<string, unknown>;
        return {
          sosId: (raw.sosId ?? raw.SosId ?? raw.id ?? raw.Id ?? sosId) as string,
          driverId: (raw.driverId ?? raw.DriverId ?? '') as string,
          driverName: (raw.driverName ?? raw.DriverName ?? '') as string,
          driverPhone: (raw.driverPhone ?? raw.DriverPhone ?? '') as string,
          driverPlateNumber: (raw.driverPlateNumber ?? raw.DriverPlateNumber ?? '') as string,
          vehicleModel: (raw.vehicleModel ?? raw.VehicleModel ?? '') as string,
          driverPosition: {
            latitude: (pos.latitude ?? pos.Latitude ?? 0) as number,
            longitude: (pos.longitude ?? pos.Longitude ?? 0) as number,
          },
          isActive: (raw.isActive ?? raw.IsActive ?? true) as boolean,
          createdAt: (raw.createdAt ?? raw.CreatedAt ?? '') as string,
        };
      }

      return null;
    }

    return parseResult.data;
  } catch (error) {
    debugLog('Error polling SOS status:', error);
    return null;
  }
}

/**
 * Send a geolocation update for an active SOS
 */
export async function addSOSGeolocation(
  sosId: string,
  request: AddSOSGeolocationRequest
): Promise<void> {
  debugLog('Sending SOS geolocation:', { sosId, request });

  await apiPost<unknown>(`/sos/${sosId}/geolocation`, request);

  debugLog('SOS geolocation sent successfully');
}
