import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { parseGPSCoordinates } from "@/lib/validation";
import { config, isVideoFeatureEnabled } from "@/lib/config";
import { getTrackingInfo } from "@/lib/api/tracking";
import { reverseGeocode } from "@/lib/api/geocoding";
import { getRiderKey } from "@/lib/riderKey";
import { distanceMeters } from "@/lib/geo/distance";
import { useVideoRequest } from "@/hooks/useVideoRequest";
import { useVideoPreview } from "@/hooks/useVideoPreview";
import VideoReceipt from "@/components/ride/VideoReceipt";

/** Rides shorter than this show the full video inline (no preview needed). */
const SHORT_RIDE_MS = 3 * 60_000;

type LatLng = { latitude: number; longitude: number };

interface RideEndLocationState {
  locationHistory?: LatLng[];
}

/**
 * RideEnd — the video-receipt view.
 *
 * The screen is anchored on the ride's video recording, framed as a downloadable,
 * ticket-style receipt: perforated header with the receipt number, a video hero,
 * the travelled route, driver + vehicle, trip metadata, and a QR-linked
 * verification stamp. The (encrypted) video is requested automatically on mount;
 * the hero shows a "preparing…" state and fills in once the decrypt/merge lands.
 */
const RideEnd = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // The traveled route, forwarded from TrackRide via router state. Absent on a
  // hard reload — the map then degrades to last-position + destination only.
  const locationHistory = useMemo<LatLng[]>(
    () => (location.state as RideEndLocationState | null)?.locationHistory ?? [],
    [location.state],
  );

  // ── Params ────────────────────────────────────────────────────────────────
  const trackingId = searchParams.get("trackingId") || "";
  const status = searchParams.get("status") || "ArrivedSafely";
  const closedAtParam = searchParams.get("closedAt") || undefined;
  const startedAtParam = searchParams.get("startedAt") || undefined;
  const destination = searchParams.get("destination") || "";
  const lastPositionParam = searchParams.get("lastPosition") || "";
  const pickupParam = searchParams.get("pickup") || "";

  const driverName = searchParams.get("driverName") || "";
  const plateNumber = searchParams.get("plateNumber") || "";
  const modelType = searchParams.get("modelType") || "";
  const pictureUrlParam = searchParams.get("pictureUrl");
  const pictureUrl = pictureUrlParam ? decodeURIComponent(pictureUrlParam) : "";
  const ratingParam = searchParams.get("rating");
  const driverRating = ratingParam ? Number(ratingParam) : undefined;
  const driverPhone = searchParams.get("phone") || "";

  // The video pipeline keys on the ride confirmation id. In the RideManager flow
  // the tracking session's rideId IS the confirmation id, so the existing rideId
  // param carries it; otherwise resolve it from the tracking session.
  const rideIdParam = searchParams.get("rideId") || "";
  const [confirmationId, setConfirmationId] = useState<string | null>(
    rideIdParam || null,
  );
  // Rider's decryption key, captured from the tracking link at /start and stored
  // against the confirmation id. Required to request the encrypted video.
  const [riderKey, setRiderKey] = useState<string | null>(
    rideIdParam ? getRiderKey(rideIdParam) : null,
  );

  const videoConfigured = isVideoFeatureEnabled();

  // Resolve the confirmation id + rider key so the receipt can request the
  // (encrypted) video. Only the rider (sender) captures a rider key at /start.
  useEffect(() => {
    if (!videoConfigured || !trackingId) return;
    let cancelled = false;

    const resolve = async () => {
      let resolvedId = confirmationId;
      if (!resolvedId) {
        try {
          const info = await getTrackingInfo(trackingId);
          if (!cancelled && info?.rideId) {
            resolvedId = info.rideId;
            setConfirmationId(info.rideId);
          }
        } catch {
          // Non-fatal: the receipt stays in "preparing" until the id resolves.
        }
      }
      if (!cancelled && resolvedId && !riderKey) {
        setRiderKey(getRiderKey(resolvedId));
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [videoConfigured, trackingId, confirmationId, riderKey]);

  // Ride length decides the experience: < 3 min → show the full video inline as
  // today; ≥ 3 min → a cheap ~15s preview + on-demand full download.
  const durationMs = useMemo<number | null>(() => {
    if (!startedAtParam || !closedAtParam) return null;
    const s = new Date(startedAtParam).getTime();
    const e = new Date(closedAtParam).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
    return e - s;
  }, [startedAtParam, closedAtParam]);
  const isShortRide = durationMs != null && durationMs < SHORT_RIDE_MS;

  // Cheap preview (long rides). Auto-requested by the hook.
  const {
    previewState,
    previewUrl,
    error: previewError,
    retry: retryPreview,
  } = useVideoPreview(isShortRide ? null : confirmationId, riderKey);

  // Opt-in on-device diagnostics: append ?debug=1 to see why the video is/isn't
  // loading (config, ids, key, request state) without mobile devtools.
  const showDiagnostics = searchParams.get("debug") === "1";

  // Full video: on-demand for long rides (Download), auto for short rides.
  const { state: videoState, videoUrl, requestVideo, retry } = useVideoRequest(
    confirmationId,
    riderKey,
  );

  // If the ride has no preview clip, fall back to showing the full video inline.
  const mode: "preview" | "full" =
    isShortRide || previewState === "unavailable" ? "full" : "preview";

  // Auto-start the full merge only in full mode (short ride / preview fallback).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (mode !== "full") return;
    if (!confirmationId || !riderKey) return;
    if (videoState === "idle" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      requestVideo();
    }
  }, [mode, confirmationId, riderKey, videoState, requestVideo]);

  // Preview-mode Download: prepare the full video on demand, then save it once ready.
  const [downloadRequested, setDownloadRequested] = useState(false);
  const handleDownloadFull = useCallback(() => {
    setDownloadRequested(true);
    requestVideo();
  }, [requestVideo]);
  useEffect(() => {
    if (downloadRequested && videoUrl) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
      setDownloadRequested(false);
    }
  }, [downloadRequested, videoUrl]);
  const fullPending = downloadRequested && videoState !== "ready";

  const receiptId = confirmationId || rideIdParam || trackingId || "PENDING";

  const destinationPosition = destination ? parseGPSCoordinates(destination) : null;
  const lastPosition = lastPositionParam ? parseGPSCoordinates(lastPositionParam) : null;

  // Human-readable pickup/dropoff, reverse-geocoded from the ride coordinates.
  // Google's Geocoding API falls back to a "lat, lng" string on failure; we drop
  // those so the receipt shows "—" rather than raw coordinates.
  const [pickupLabel, setPickupLabel] = useState<string | undefined>();
  const [dropoffLabel, setDropoffLabel] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    const looksLikeCoords = (s: string) =>
      /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(s.trim());
    const resolve = (
      raw: string,
      set: (v: string | undefined) => void,
    ) => {
      const pos = raw ? parseGPSCoordinates(raw) : null;
      if (!pos) return;
      reverseGeocode(pos).then((addr) => {
        if (!cancelled && addr && !looksLikeCoords(addr)) set(addr);
      });
    };
    resolve(pickupParam, setPickupLabel);
    resolve(destination, setDropoffLabel);
    return () => {
      cancelled = true;
    };
  }, [pickupParam, destination]);

  // Distance travelled, summed over the tracked route (km). Undefined when the
  // route history is unavailable (e.g. hard reload) so the receipt shows "—".
  const distanceKm = useMemo<number | undefined>(() => {
    if (locationHistory.length < 2) return undefined;
    let meters = 0;
    for (let i = 1; i < locationHistory.length; i++) {
      meters += distanceMeters(locationHistory[i - 1], locationHistory[i]);
    }
    if (meters < 10) return undefined;
    return meters / 1000;
  }, [locationHistory]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  // Offline caching of the last receipt view — keeps the receipt readable
  // (driver, trip, receipt id, QR) after a signal drop. The video itself is
  // still fetched from the backend when playback is requested.
  useEffect(() => {
    if (!receiptId) return;
    try {
      const snapshot = {
        receiptId,
        driver: { name: driverName, pictureUrl, plate: plateNumber, model: modelType },
        trip: {
          pickupLabel,
          dropoffLabel,
          startedAt: startedAtParam,
          endedAt: closedAtParam,
          distanceKm,
          status,
        },
        map: {
          lastPosition: lastPosition || undefined,
          destination: destinationPosition || undefined,
        },
        videoUrl: videoUrl || null,
        shareUrl,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(`ride-receipt:${receiptId}`, JSON.stringify(snapshot));
    } catch {
      /* quota / private mode: safe to ignore */
    }
  }, [
    receiptId,
    driverName,
    pictureUrl,
    plateNumber,
    modelType,
    pickupLabel,
    dropoffLabel,
    startedAtParam,
    closedAtParam,
    distanceKm,
    status,
    lastPosition,
    destinationPosition,
    videoUrl,
    shareUrl,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center px-4 md:px-6 py-6">
      <VideoReceipt
        receiptId={receiptId}
        videoUrl={videoUrl}
        shareUrl={shareUrl}
        showVideo={!!riderKey}
        isFailed={videoState === "failed"}
        onRetry={retry}
        mode={mode}
        previewUrl={previewUrl}
        previewState={previewState}
        previewError={previewError}
        onRetryPreview={retryPreview}
        onDownloadFull={handleDownloadFull}
        fullPending={fullPending}
        driver={{
          name: driverName,
          pictureUrl: pictureUrl || undefined,
          plate: plateNumber || undefined,
          model: modelType || undefined,
          rating:
            driverRating != null && !Number.isNaN(driverRating)
              ? driverRating
              : undefined,
          phone: driverPhone || undefined,
        }}
        trip={{
          pickupLabel,
          dropoffLabel,
          startedAt: startedAtParam,
          endedAt: closedAtParam,
          distanceKm,
          status,
        }}
        map={{
          lastPosition: lastPosition || undefined,
          destination: destinationPosition || undefined,
        }}
        locationHistory={locationHistory}
      />

      {showDiagnostics && (
        <div className="mt-6 w-full max-w-lg rounded-lg border border-border bg-card p-4 text-left font-mono text-[11px] leading-relaxed text-foreground shadow-sm">
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Video diagnostics
          </p>
          <dl className="space-y-0.5 break-all">
            <div>videoApi.baseUrl: <b>{config.videoApi.baseUrl || "(EMPTY)"}</b></div>
            <div>videoApi.code: <b>{config.videoApi.functionCode ? "set" : "(EMPTY)"}</b></div>
            <div>trackingId: <b>{trackingId || "(none)"}</b></div>
            <div>confirmationId: <b>{confirmationId || "(UNRESOLVED)"}</b></div>
            <div>riderKey: <b>{riderKey ? "present" : "MISSING"}</b></div>
            <div>durationMs: <b>{durationMs ?? "(unknown)"}</b> → mode: <b>{mode}</b></div>
            <div>previewState: <b>{previewState}</b></div>
            <div>previewUrl: <b>{previewUrl ? "ready" : "(none)"}</b></div>
            <div>previewError: <b>{previewError || "none"}</b></div>
            <div>fullState: <b>{videoState}</b></div>
          </dl>
        </div>
      )}
    </div>
  );
};

export default RideEnd;
