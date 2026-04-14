import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, User, Car } from "lucide-react";
import MapView from "@/components/MapView";
import { parseGPSCoordinates } from "@/lib/validation";

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
                  <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={2.5} />
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
