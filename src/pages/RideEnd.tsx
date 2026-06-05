import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, User, Car } from "lucide-react";
import MapView from "@/components/MapView";
import { parseGPSCoordinates } from "@/lib/validation";
import { isVideoFeatureEnabled } from "@/lib/config";
import { getTrackingInfo } from "@/lib/api/tracking";
import { getRiderKey } from "@/lib/riderKey";
import SatisfactionPrompt from "@/components/ride/SatisfactionPrompt";
import RideVideoCard from "@/components/ride/RideVideoCard";

const RideEnd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract closure params from URL
  const trackingId = searchParams.get("trackingId") || "";
  const status = searchParams.get("status") || "ArrivedSafely";
  const closedAtParam = searchParams.get("closedAt");
  const destination = searchParams.get("destination") || "";

  // Extract driver info params
  const driverName = searchParams.get("driverName") || "";
  const plateNumber = searchParams.get("plateNumber") || "";
  const modelType = searchParams.get("modelType") || "";
  const pictureUrlParam = searchParams.get("pictureUrl");
  const pictureUrl = pictureUrlParam ? decodeURIComponent(pictureUrlParam) : "";

  // Extract viewer type (driver or watcher)
  const viewerType = (searchParams.get("viewerType") || "watcher") as
    | "driver"
    | "watcher";

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

  // Rider satisfaction: null = unanswered. Choosing "Not satisfied" reveals the
  // video request flow.
  const [satisfied, setSatisfied] = useState<boolean | null>(null);

  // The video feature is gated on the rider's decryption key, not viewerType:
  // only the rider (sender) captures a riderKey at /start, so its presence is
  // what makes the flow usable. `videoConfigured` is the synchronous config gate
  // used to drive key resolution; the visible flow waits for the key itself.
  const videoConfigured = isVideoFeatureEnabled();

  // Resolve the confirmation id + rider key (and auto-reveal the card on return
  // visits) once the rider is in the unsatisfied path or a request is persisted.
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
          // Non-fatal: the card stays disabled until the id resolves.
        }
      }
      if (!cancelled && resolvedId) {
        if (!riderKey) {
          setRiderKey(getRiderKey(resolvedId));
        }
        // If a video request is already in progress/ready, reveal the card so the
        // rider lands back in the right place.
        const persisted = localStorage.getItem(`ride-video:${resolvedId}`);
        if (persisted && satisfied === null) {
          setSatisfied(false);
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [videoConfigured, trackingId, confirmationId, riderKey, satisfied]);

  // Show the video flow once we have the rider's key (rider/sender only).
  const showVideoFlow = videoConfigured && !!riderKey;

  // Parse destination coordinates for the map
  const destinationPosition = destination
    ? parseGPSCoordinates(destination)
    : null;

  // Parse last known driver position (may be absent on legacy links)
  const lastPositionParam = searchParams.get("lastPosition") || "";
  const lastPosition = lastPositionParam
    ? parseGPSCoordinates(lastPositionParam)
    : null;

  // Check if driver info is available
  const hasDriverInfo = Boolean(driverName);

  // Format closure timestamp
  const getFormattedTime = (): string => {
    if (closedAtParam) {
      try {
        const date = new Date(closedAtParam);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        // Fall through to default
      }
    }
    // Fallback to current time
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get message based on ride status and viewer type
  const getCompletionMessage = (): {
    title: string;
    subtitle: string;
    isSuccess: boolean;
  } => {
    if (status === "Cancelled") {
      return {
        title: "Ride Cancelled",
        subtitle: "The ride was cancelled.",
        isSuccess: false,
      };
    }

    if (viewerType === "driver") {
      switch (status) {
        case "ArrivedSafely":
          return {
            title: "Customer has arrived safely",
            subtitle: "The ride has been completed successfully.",
            isSuccess: true,
          };
        case "RideEndedByDriver":
          return {
            title: "Ride finished",
            subtitle: "You have ended the ride.",
            isSuccess: true,
          };
        default:
          return {
            title: "Ride completed",
            subtitle: "The ride has ended.",
            isSuccess: true,
          };
      }
    } else {
      switch (status) {
        case "ArrivedSafely":
        case "RideEndedByDriver":
          return {
            title: "Rider has arrived safely!",
            subtitle: "The ride has been completed successfully.",
            isSuccess: true,
          };
        default:
          return {
            title: "Ride completed",
            subtitle: "The ride has ended.",
            isSuccess: true,
          };
      }
    }
  };

  const {
    title: completionTitle,
    subtitle: completionSubtitle,
    isSuccess,
  } = getCompletionMessage();
  const formattedTime = getFormattedTime();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <h1 className="text-xl font-semibold text-center">Ride Completed</h1>
      </header>

      {/* Map showing last known driver position and destination */}
      {(lastPosition || destinationPosition) && (
        <div className="w-full h-[45vh] md:h-[55vh] min-h-[280px] border-y border-border shadow-inner overflow-hidden">
          <MapView
            initialPosition={lastPosition || destinationPosition || undefined}
            destinationPosition={destinationPosition || undefined}
            showGoogleMap={true}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 pt-6 pb-8 flex flex-col items-center gap-6 -mt-8 relative z-10">
        {/* Completion Card */}
        <Card
          className={`w-full max-w-md shadow-2xl backdrop-blur-sm ${
            isSuccess
              ? "border-success/40 shadow-success/20 bg-card/95"
              : "border-muted bg-card/95"
          }`}
        >
          <CardContent className="p-8 text-center space-y-6">
            {/* Success/Status Icon */}
            <div className="flex justify-center">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center ring-4 ${
                  isSuccess
                    ? "bg-gradient-to-br from-success/25 to-success/5 ring-success/20 animate-in zoom-in-50 duration-500"
                    : "bg-muted ring-muted-foreground/20"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2
                    className="h-14 w-14 text-success"
                    strokeWidth={2.5}
                  />
                ) : (
                  <XCircle className="h-14 w-14 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Completion Message */}
            <div className="space-y-3">
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    isSuccess
                      ? "bg-success/10 text-success border border-success/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {isSuccess ? "Completed" : "Cancelled"}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{completionTitle}</h2>
              <p className="text-muted-foreground">{completionSubtitle}</p>
              <p className="text-sm text-muted-foreground">
                {viewerType === "driver" ? "Your" : "The"} ride ended at{" "}
                <span className="font-medium">{formattedTime}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Driver Info Card - Only shown when driver info is available */}
        {hasDriverInfo && (
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {/* Driver Photo */}
                <Avatar className="h-16 w-16 border-2 border-border">
                  {pictureUrl ? (
                    <AvatarImage src={pictureUrl} alt={driverName} />
                  ) : null}
                  <AvatarFallback className="bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>

                {/* Driver Details */}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-lg">{driverName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="h-4 w-4" />
                    <span>{modelType}</span>
                  </div>
                  {plateNumber && (
                    <p className="text-sm font-mono text-muted-foreground">
                      {plateNumber}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rider satisfaction + video request (watcher view) */}
        {showVideoFlow && (
          <>
            <SatisfactionPrompt selected={satisfied} onSelect={setSatisfied} />
            {satisfied === false && (
              <RideVideoCard
                confirmationId={confirmationId}
                riderKey={riderKey}
              />
            )}
          </>
        )}

        {/* Actions - Only shown for driver */}
        {viewerType === "driver" && (
          <div className="w-full max-w-md space-y-3">
            <Button variant="outline" className="w-full">
              Report an Issue
            </Button>
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideEnd;
