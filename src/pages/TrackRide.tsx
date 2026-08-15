import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Star,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Car,
  ShieldAlert,
  StopCircle,
  Loader2,
} from "lucide-react";
import MapView from "@/components/MapView";
import driverPhoto from "@/assets/driver-photo.jpg";
import { useToast } from "@/hooks/use-toast";
import { debugLog } from "@/lib/config";
import {
  getLatestLocation,
  sendLocationUpdate,
  closeTracking,
  getTrackingInfo,
  triggerSosAlert,
  reverseGeocode as apiReverseGeocode,
  snapPositionWithHistory,
  type Position,
  type CloseTrackingRequest,
  type NormalizedDriverInfo,
} from "@/lib/api";
import { getSosRecipientPhones } from "@/lib/sosRecipients";
import { parseGPSCoordinates } from "@/lib/validation";
import { handleApiError } from "@/lib/errors";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { appendPositionIfNew } from "@/lib/geo/locationHistory";
import { positionsEqual } from "@/lib/geo/distance";

const TrackRide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sosValue, setSosValue] = useState([0]);
  const [sosActivated, setSosActivated] = useState(false);
  const [sosMuted, setSosMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEndingRide, setIsEndingRide] = useState(false);
  const [showEndRideDialog, setShowEndRideDialog] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationHistory, setLocationHistory] = useState<Position[]>([]);
  const locationHistoryRef = useRef<Position[]>([]);
  const lastServerPositionRef = useRef<Position | null>(null);
  const [currentLocationAddress, setCurrentLocationAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const { toast } = useToast();

  // Mobile: the info panel's height varies (watchers have no SOS slider / End Ride,
  // so it's short). Measure it and reserve exactly that much space below the map, so
  // the map grows to fill the rest instead of leaving a dark gap. Desktop floats the
  // card top-right over a full-screen map, so no reserve there.
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPanelHeight(el.offsetHeight));
    ro.observe(el);
    setPanelHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const from = searchParams.get("from") || "Current Location";
  const to = searchParams.get("to") || "Destination";
  const sendingTrackingInfo =
    searchParams.get("sendingTrackingInfo") === "true";
  const trackingId = searchParams.get("trackingId") || "";
  const driverId = searchParams.get("driverId") || "";

  // Parse driver info from query string (rider flow). For the watcher
  // flow the URL has no driverData param — see the fetch effect below
  // that populates this state from getTrackingInfo() on mount.
  const driverDataParam = searchParams.get("driverData");
  console.log("Raw driverData param:", driverDataParam);

  const [driverInfo, setDriverInfo] = useState<NormalizedDriverInfo | null>(
    () => {
      if (!driverDataParam) return null;
      try {
        return JSON.parse(driverDataParam);
      } catch {
        try {
          return JSON.parse(decodeURIComponent(driverDataParam));
        } catch {
          console.warn("Failed to parse driverData:", driverDataParam);
          return null;
        }
      }
    },
  );
  console.log("Parsed driver info:", driverInfo);

  const driverName = (() => {
    if (!driverInfo) return "Driver";
    const first = driverInfo.firstName?.trim();
    const last = driverInfo.lastName?.trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return "Driver";
  })();
  const driverRating =
    driverInfo?.rating !== undefined && driverInfo?.rating !== null
      ? driverInfo.rating
      : 4.8;
  const carInfo = (() => {
    if (!driverInfo) return "";
    const brand = driverInfo.carBrand?.trim();
    const model =
      driverInfo.carModel?.trim() || driverInfo.modelType?.trim();
    if (brand && model) return `${brand} ${model}`;
    return model || brand || "";
  })();
  const carPlate = driverInfo?.plateNumber || "";
  const driverPhotoUrl = driverInfo?.pictureUrl || driverPhoto;
  const driverPhone = driverInfo?.phone || "";

  console.log("Driver display values:", {
    driverName,
    driverRating,
    carInfo,
    carPlate,
    driverPhotoUrl,
    driverPhone,
  });

  // Parse GPS coordinates using validation service
  const initialPosition = parseGPSCoordinates(from);
  const destinationPosition = parseGPSCoordinates(to);

  useEffect(() => {
    locationHistoryRef.current = locationHistory;
  }, [locationHistory]);

  // Stamp a ride start time once per tracking session so the ride-end receipt
  // can show Start/Duration. Persisted (keyed by trackingId) to survive reloads.
  useEffect(() => {
    if (!trackingId) return;
    const key = `ride-start:${trackingId}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, new Date().toISOString());
      }
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [trackingId]);

  // Common receipt metadata forwarded to /ride-end: pickup coords (for reverse
  // geocoding), the ride start time, and the full driver details (photo, rating,
  // phone) so the rider's receipt shows who drove them.
  const appendReceiptMeta = (params: URLSearchParams) => {
    if (initialPosition && from) params.set("pickup", from);
    if (driverPhotoUrl) params.set("pictureUrl", encodeURIComponent(driverPhotoUrl));
    if (driverRating != null) params.set("rating", String(driverRating));
    if (driverPhone) params.set("phone", driverPhone);
    try {
      const start = localStorage.getItem(`ride-start:${trackingId}`);
      if (start) params.set("startedAt", start);
    } catch {
      /* ignore */
    }
  };

  // Geocode initial position on mount
  useEffect(() => {
    if (initialPosition && !currentPosition) {
      setCurrentPosition(initialPosition);
    }
  }, []);

  // Geocode destination on mount
  useEffect(() => {
    if (destinationPosition) {
      reverseGeocode(
        destinationPosition.latitude,
        destinationPosition.longitude,
      ).then((address) => {
        if (address) {
          setDestinationAddress(address);
        }
      });
    }
  }, []);

  // Watcher (follower) flow: their share link has no driverData URL param,
  // so fetch the rich tracking record once on mount to populate driver info.
  useEffect(() => {
    if (sendingTrackingInfo || !trackingId || driverInfo) return;
    getTrackingInfo(trackingId)
      .then((info) => {
        if (info?.driverInfo) {
          setDriverInfo(info.driverInfo);
        }
      })
      .catch((err) => {
        debugLog("Watcher: failed to fetch tracking info:", err);
      });
  }, [sendingTrackingInfo, trackingId, driverInfo]);

  // Use API service for reverse geocoding
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const address = await apiReverseGeocode({ latitude: lat, longitude: lon });
    // Return empty string if we only got back coordinates (fallback)
    if (address.includes(",") && !address.includes(" ")) {
      return "";
    }
    return address;
  };

  // Update address when position changes
  useEffect(() => {
    console.log("Current position changed:", currentPosition);
    if (currentPosition) {
      reverseGeocode(currentPosition.latitude, currentPosition.longitude).then(
        (address) => {
          console.log("Setting address:", address);
          if (address) {
            setCurrentLocationAddress(address);
          }
        },
      );
    }
  }, [currentPosition]);

  // Fetch tracking location at intervals if NOT sending (family member watching)
  useEffect(() => {
    if (sendingTrackingInfo || !trackingId) {
      console.log(
        "Skipping location fetching - either sending or no trackingId:",
        {
          sendingTrackingInfo,
          trackingId,
        },
      );
      return;
    }

    const fetchLocationUpdate = async () => {
      try {
        debugLog("Fetching latest location for trackingId:", trackingId);

        const latestLocation = await getLatestLocation(trackingId);

        if (latestLocation) {
          console.log("Watcher poll:", {
            rideStatus: latestLocation.rideStatus,
            isRideActive: latestLocation.isRideActive,
          });

          // Detect SOS FIRST — must fire even if backend also marks the ride
          // as inactive, otherwise the early-return below would navigate the
          // watcher away before they ever see the emergency state.
          // Track the backend value both ways so the alarm stops when SOS is
          // resolved (e.g. driver pressed "I'm OK" or admin cleared it).
          setSosActivated(latestLocation.rideStatus === "SOS");

          const endedRideStatuses = [
            "ArrivedSafely",
            "RideEndedByDriver",
            "Cancelled",
          ];

          // Only navigate to RideEnd for "normal" end states.
          // SOS is an active emergency — keep the watcher on TrackRide so
          // they see the red banner, hear the siren, and watch the live map.
          const isNormalEnd =
            latestLocation.rideStatus !== "SOS" &&
            (!latestLocation.isRideActive ||
              endedRideStatuses.includes(latestLocation.rideStatus));

          if (isNormalEnd) {
            const params = new URLSearchParams({
              trackingId,
              status: latestLocation.rideStatus,
              viewerType: "watcher",
            });

            if (latestLocation.rideId) {
              params.set("rideId", latestLocation.rideId);
            }

            if (driverName) {
              params.set("driverName", driverName);
            }
            if (carPlate) {
              params.set("plateNumber", carPlate);
            }
            if (carInfo) {
              params.set("modelType", carInfo);
            }

            if (to) {
              params.set("destination", to);
            }

            // Forward last known driver position (server value preferred, state as fallback)
            const lastPos = latestLocation.position || currentPosition;
            if (lastPos) {
              params.set(
                "lastPosition",
                `${lastPos.latitude},${lastPos.longitude}`,
              );
            }

            appendReceiptMeta(params);
            params.set("closedAt", new Date().toISOString());

            navigate(`/ride-end?${params.toString()}`, {
              state: { locationHistory: locationHistoryRef.current },
            });
            return;
          }

          const rawPosition = latestLocation.position;

          if (
            lastServerPositionRef.current &&
            positionsEqual(lastServerPositionRef.current, rawPosition)
          ) {
            debugLog("Watcher poll: position unchanged, skipping snap");
            return;
          }
          lastServerPositionRef.current = rawPosition;

          const snappedPosition = await snapPositionWithHistory(
            locationHistoryRef.current.slice(-9),
            rawPosition,
          );

          setCurrentPosition(snappedPosition);
          setLocationHistory((prev) =>
            appendPositionIfNew(prev, snappedPosition),
          );

          debugLog("Position updated:", { raw: rawPosition, snapped: snappedPosition });
        }
      } catch (error) {
        // Log but don't show error to user for polling failures
        // The retry logic in the API client will handle transient errors
        debugLog("Error fetching location update:", error);
      }
    };

    // Fetch immediately on mount
    fetchLocationUpdate();

    // Poll every 5 seconds so emergency state (SOS) reaches the watcher fast.
    const interval = setInterval(fetchLocationUpdate, 5000);

    return () => clearInterval(interval);
  }, [
    sendingTrackingInfo,
    trackingId,
    navigate,
    driverName,
    carPlate,
    carInfo,
  ]);

  const handleDriverLocationFix = useCallback(
    async ({ raw, snapped }: { raw: Position; snapped: Position }) => {
      debugLog("Sending location update:", {
        trackingId,
        driverId,
        raw,
        snapped,
      });

      setCurrentPosition(snapped);
      setLocationHistory((prev) => appendPositionIfNew(prev, snapped));

      try {
        const updateResult = await sendLocationUpdate(
          trackingId,
          driverId,
          snapped,
        );
        console.log("Location update result:", updateResult);
        console.log(
          "isTrackingFinished value:",
          updateResult.isTrackingFinished,
          "type:",
          typeof updateResult.isTrackingFinished,
        );

        if (updateResult.isTrackingFinished === true) {
          console.warn(
            "Tracking finished detected! Redirecting to ride-end...",
          );
          const endParams = new URLSearchParams({
            trackingId,
            status: "ArrivedSafely",
            viewerType: "driver",
            driverName: driverName,
            plateNumber: carPlate,
            modelType: carInfo,
          });
          if (to) {
            endParams.set("destination", to);
          }
          endParams.set(
            "lastPosition",
            `${snapped.latitude},${snapped.longitude}`,
          );
          appendReceiptMeta(endParams);
          endParams.set("closedAt", new Date().toISOString());
          navigate(`/ride-end?${endParams.toString()}`, {
            state: { locationHistory: locationHistoryRef.current },
          });
        }
      } catch (error) {
        debugLog("Error sending location update:", error);
      }
    },
    [trackingId, driverId, navigate, driverName, carPlate, carInfo, to],
  );

  useDriverLocation({
    enabled: sendingTrackingInfo && !!trackingId && !!driverId,
    onFix: handleDriverLocationFix,
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Reset the mute flag whenever SOS clears, so the next emergency
  // doesn't start silently.
  useEffect(() => {
    if (!sosActivated) {
      setSosMuted(false);
    }
  }, [sosActivated]);

  // Audible + haptic alarm when SOS is active.
  // IMPORTANT: only fires for the FOLLOWER (watcher), not the rider — the
  // rider may have triggered SOS in secret and we don't want to alert anyone
  // physically near them. Repeats every 60 seconds until the SOS is resolved
  // by the backend or the follower explicitly mutes it.
  useEffect(() => {
    if (sendingTrackingInfo) return; // rider gets visual banner only, no audio/haptic
    if (!sosActivated) return;
    if (sosMuted) return;

    const playAlarm = () => {
      // Haptic feedback (no-op on iOS Safari, harmless elsewhere)
      if (typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
        } catch {
          // ignore — vibration not allowed
        }
      }

      // Audible siren via Web Audio API. No asset file needed.
      // NOTE: requires a prior user gesture on iOS Safari to be unlocked,
      // so this may silently no-op if the watcher hasn't interacted yet.
      // The visual banner is the guaranteed-visible channel.
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const playTone = (
          freq: number,
          startOffset: number,
          duration: number,
        ) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const startTime = ctx.currentTime + startOffset;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
          gain.gain.setValueAtTime(0.35, startTime + duration - 0.02);
          gain.gain.linearRampToValueAtTime(0, startTime + duration);
          osc.connect(gain).connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        // Siren pattern: alternating high/low for ~2.4s
        for (let i = 0; i < 4; i++) {
          playTone(880, i * 0.6, 0.3);
          playTone(660, i * 0.6 + 0.3, 0.3);
        }
        // Close the context after the siren finishes
        setTimeout(() => ctx.close().catch(() => {}), 3000);
      } catch (err) {
        debugLog("SOS sound playback failed:", err);
      }
    };

    // Fire once immediately on transition, then every 60 seconds
    playAlarm();
    const interval = setInterval(playAlarm, 60000);
    return () => clearInterval(interval);
  }, [sosActivated, sosMuted, sendingTrackingInfo]);

  const handleSosChange = async (value: number[]) => {
    // While SOS is active, the slider stays pinned at 100. Pulling it back
    // below 95 deactivates the emergency.
    if (sosActivated) {
      if (value[0] < 95) {
        setSosActivated(false);
        setSosValue([0]);

        const position = currentPosition || initialPosition;
        if (position && trackingId && driverId) {
          try {
            await sendLocationUpdate(
              trackingId,
              driverId,
              position,
              "Ongoing",
            );
            debugLog("SOS deactivated via geolocation update");
          } catch (error) {
            debugLog("SOS deactivation failed:", error);
            toast({
              title: "SOS clear failed",
              description:
                "Could not reach the server. Watchers may still see the alert.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Force the slider to stay at 100 while SOS is engaged
        setSosValue([100]);
      }
      return;
    }

    setSosValue(value);
    if (value[0] < 95) return;

    setSosActivated(true);
    // Pin the slider at 100 to show SOS is engaged
    setSosValue([100]);

    // Need a position to send. Fall back to the initial parsed coordinate
    // if the geolocation hasn't yielded a fresh fix yet.
    const position = currentPosition || initialPosition;

    // Alert the rider's chosen emergency contacts by SMS via the backend /sos.
    // Done FIRST and independently of the watcher status-flip below, so a missing
    // driverId/position can never stop the SOS SMS from going out. The numbers were
    // stored on this device when the ride was shared. Best-effort; never throws.
    if (trackingId) {
      const recipients = getSosRecipientPhones(trackingId);
      if (recipients.length > 0) {
        debugLog("SOS: alerting emergency contacts", { trackingId, count: recipients.length });
        void triggerSosAlert({
          trackingId,
          driverId,
          driverName,
          driverPlateNumber: carPlate,
          position,
          recipients,
        });
      } else {
        debugLog(
          "SOS: no emergency contacts stored for this ride — /sos not called.",
          { trackingId },
        );
        toast({
          title: "No emergency contacts",
          description:
            "SOS is active, but no friends/family were added for this ride, so no SMS was sent.",
          variant: "destructive",
        });
      }
    }

    if (!position || !trackingId || !driverId) {
      toast({
        title: "SOS triggered",
        description:
          "Emergency state set locally, but could not reach the server.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Flip the ride state via the existing geolocation endpoint
      // by including rideStatus: "SOS" in the payload.
      await sendLocationUpdate(trackingId, driverId, position, "SOS");
      debugLog("SOS reported via geolocation update");
    } catch (error) {
      debugLog("SOS geolocation update failed:", error);
      toast({
        title: "SOS network error",
        description:
          "Could not reach the server. Watchers may not see your alert until connection returns.",
        variant: "destructive",
      });
    }
  };

  const handleEndRide = async () => {
    if (!trackingId) {
      toast({
        title: "Error",
        description: "Missing tracking ID",
        variant: "destructive",
      });
      return;
    }

    setIsEndingRide(true);

    try {
      // Send a final location update with "ArrivedSafely" status
      // so the watcher's polling detects the ride end immediately
      if (currentPosition && driverId) {
        try {
          await sendLocationUpdate(trackingId, driverId, currentPosition);
          debugLog("Final location update sent with ArrivedSafely status");
        } catch (err) {
          debugLog("Failed to send final location update:", err);
        }
      }

      const request: CloseTrackingRequest = {
        arrivedSafely: true,
        driverId: driverId || undefined,
        rideStatus: "ArrivedSafely",
      };

      debugLog("Closing tracking:", { trackingId, request });

      const result = await closeTracking(trackingId, request);

      debugLog("Tracking closed successfully:", result);

      // Navigate to RideEnd with closure data and driver info
      const params = new URLSearchParams({
        trackingId: result.trackingId,
        status: result.rideStatus,
        closedAt: result.closedAt,
        viewerType: "driver",
        driverName: driverName,
        plateNumber: carPlate,
        modelType: carInfo,
      });

      if (result.rideId) {
        params.set("rideId", result.rideId);
      }

      if (to) {
        params.set("destination", to);
      }

      if (currentPosition) {
        params.set(
          "lastPosition",
          `${currentPosition.latitude},${currentPosition.longitude}`,
        );
      }

      // Add optional params with encoding for special characters
      if (driverPhotoUrl && driverPhotoUrl !== driverPhoto) {
        params.set("pictureUrl", encodeURIComponent(driverPhotoUrl));
      }

      appendReceiptMeta(params);

      navigate(`/ride-end?${params.toString()}`, {
        state: { locationHistory: locationHistoryRef.current },
      });
    } catch (error) {
      debugLog("Error closing tracking:", error);

      toast({
        title: "Failed to end ride",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsEndingRide(false);
      setShowEndRideDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Status Banners */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {!isOnline && (
          <div className="bg-warning text-warning-foreground px-4 py-3 flex items-center gap-3 shadow-md">
            <span className="flex-1 text-sm font-medium">
              NO NETWORK CONNECTION - Location tracking unavailable
            </span>
          </div>
        )}
        {sosActivated && (
          <div className="bg-destructive text-destructive-foreground shadow-md animate-pulse">
            <div className="px-4 py-3 text-center font-bold text-sm">
              SOS ACTIVATED — Emergency reported. Anyone watching this ride has been alerted.
            </div>
            {!sendingTrackingInfo && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={() => setSosMuted((m) => !m)}
                  className="px-3 py-1 text-xs font-semibold rounded bg-destructive-foreground/15 hover:bg-destructive-foreground/25 transition-colors"
                >
                  {sosMuted ? "Unmute Alarm" : "Mute Alarm"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Map - fills all space above the info panel (panel height measured on mobile) */}
      <div
        className="absolute inset-0"
        style={{ paddingBottom: isDesktop ? 0 : panelHeight }}
      >
        <MapView
          initialPosition={currentPosition || initialPosition || undefined}
          destinationPosition={destinationPosition || undefined}
          locationHistory={locationHistory}
          showGoogleMap={!!(currentPosition || initialPosition)}
        />
      </div>

      {/* Info Card - Desktop: Top Right, Mobile: Bottom */}
      <Card ref={panelRef} className="absolute md:top-4 md:right-4 bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:w-96 md:max-h-[calc(100vh-2rem)] max-h-[60vh] overflow-y-auto z-10 md:rounded-lg rounded-t-2xl md:rounded-b-lg border-t md:border shadow-2xl">
        <CardContent className="p-4 space-y-4">
          {/* Driver Info */}
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden ring-2 ring-border">
                <img
                  src={driverPhotoUrl}
                  alt="Driver"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = driverPhoto;
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1">
                <Star className="h-3 w-3 fill-current" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base">{driverName}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-medium">
                      {driverRating.toFixed(1)}
                    </span>
                    <span>• 328 rides</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() =>
                      driverPhone &&
                      (window.location.href = `tel:${driverPhone}`)
                    }
                    disabled={!driverPhone}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() =>
                      driverPhone &&
                      (window.location.href = `sms:${driverPhone}`)
                    }
                    disabled={!driverPhone}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Car Info */}
              <div className="mt-2 flex items-center gap-2 text-xs bg-muted rounded-md p-2">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{carInfo}</span>
                  <span className="text-muted-foreground"> • {carPlate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup & Drop-off */}
          <div className="space-y-2.5">
            <div className="flex gap-2.5">
              <div className="mt-0.5">
                <div className="w-2 h-2 rounded-full bg-success ring-2 ring-success/20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Current Location
                </p>
                {currentLocationAddress && currentPosition ? (
                  <p className="text-sm font-medium line-clamp-2">
                    {currentLocationAddress} (
                    {currentPosition.latitude.toFixed(6)},{" "}
                    {currentPosition.longitude.toFixed(6)})
                  </p>
                ) : currentPosition ? (
                  <p className="text-sm font-medium line-clamp-2">
                    {currentPosition.latitude.toFixed(6)},{" "}
                    {currentPosition.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm font-medium line-clamp-2">{from}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2.5 ml-1">
              <div className="w-0.5 h-6 bg-border" />
            </div>

            <div className="flex gap-2.5">
              <div className="mt-0.5">
                <MapPin className="h-4 w-4 text-danger fill-current" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Drop-off</p>
                {destinationAddress && destinationPosition ? (
                  <p className="text-sm font-medium line-clamp-2">
                    {destinationAddress} (
                    {destinationPosition.latitude.toFixed(6)},{" "}
                    {destinationPosition.longitude.toFixed(6)})
                  </p>
                ) : destinationPosition ? (
                  <p className="text-sm font-medium line-clamp-2">
                    {destinationPosition.latitude.toFixed(6)},{" "}
                    {destinationPosition.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm font-medium line-clamp-2">{to}</p>
                )}
              </div>
            </div>
          </div>

          {/* End Ride Button - Only visible for driver mode */}
          {sendingTrackingInfo && (
            <div className="pt-2 border-t border-border">
              <AlertDialog
                open={showEndRideDialog}
                onOpenChange={setShowEndRideDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!isOnline || isEndingRide}
                    title={
                      !isOnline
                        ? "Cannot end ride while offline"
                        : "End this ride"
                    }
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Ride
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End this ride?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the ride as complete and stop location
                      tracking. Make sure you have arrived at your destination.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isEndingRide}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEndRide}
                      disabled={isEndingRide}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isEndingRide ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Ending...
                        </>
                      ) : (
                        "End Ride"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* SOS Slider - Only visible for rider */}
          {sendingTrackingInfo && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">
                Emergency SOS
              </span>
            </div>
            <div className="relative">
              <Slider
                value={sosValue}
                onValueChange={handleSosChange}
                max={100}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {sosActivated
                    ? "Pull back to deactivate"
                    : "Slide to activate"}
                </span>
                <span className="text-xs font-medium text-destructive">
                  {sosValue[0]}%
                </span>
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackRide;
