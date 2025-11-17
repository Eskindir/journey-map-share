import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Star,
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  Phone,
  MessageSquare,
  Car,
  ShieldAlert,
} from "lucide-react";
import MapView from "@/components/MapView";
import AlertBanner from "@/components/AlertBanner";
import driverPhoto from "@/assets/driver-photo.jpg";
import { notificationService } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

const TrackRide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [rideStatus, setRideStatus] = useState<
    "on-time" | "delayed" | "deviated" | "paused"
  >("on-time");
  const [alerts, setAlerts] = useState<string[]>([]);
  const [sosValue, setSosValue] = useState([0]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  const from = searchParams.get("from") || "Current Location";
  const to = searchParams.get("to") || "Destination";
  const eta = parseInt(searchParams.get("eta") || "20");

  // Parse driver info from query string
  const driverDataParam = searchParams.get("driverData");
  console.log("Raw driverData param:", driverDataParam);

  const driverInfo = driverDataParam
    ? JSON.parse(decodeURIComponent(driverDataParam))
    : null;
  console.log("Parsed driver info:", driverInfo);

  const driverName = driverInfo
    ? `${driverInfo.firstName} ${driverInfo.lastName}`
    : "John Driver";
  const driverRating =
    driverInfo?.rating !== undefined ? driverInfo.rating : 4.8;
  const carInfo = driverInfo
    ? `${driverInfo.carBrand} ${driverInfo.carModel}`
    : "Toyota Camry";
  const carPlate = driverInfo?.plateNumber || "ABC-1234";
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

  // Parse GPS coordinates from query string
  const parseGPS = (gpsString: string) => {
    const parts = gpsString.split(",").map((s) => s.trim());
    if (parts.length === 2) {
      return {
        latitude: parseFloat(parts[0]),
        longitude: parseFloat(parts[1]),
      };
    }
    return null;
  };

  const initialPosition = parseGPS(from);
  const destinationPosition = parseGPS(to);

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

  useEffect(() => {
    setTimeRemaining(eta);

    // Simulate countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          navigate("/ride-end");
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    // Simulate status changes for demo
    const statusTimeout = setTimeout(() => {
      const statuses: Array<"on-time" | "delayed" | "deviated" | "paused"> = [
        "on-time",
        "delayed",
        "deviated",
      ];
      const randomStatus =
        statuses[Math.floor(Math.random() * statuses.length)];
      setRideStatus(randomStatus);

      if (randomStatus === "deviated") {
        setAlerts(["Route deviation detected"]);
        // Trigger route deviation notification
        notificationService.showNotification(
          "route-deviation",
          "Your driver has deviated from the planned route."
        );
      } else if (randomStatus === "delayed") {
        // Trigger delay notification
        notificationService.showNotification(
          "delay",
          "Your ride is delayed by 5 minutes due to traffic."
        );
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(statusTimeout);
    };
  }, [eta, navigate]);

  const getStatusColor = () => {
    switch (rideStatus) {
      case "on-time":
        return "bg-success text-success-foreground";
      case "delayed":
        return "bg-warning text-warning-foreground";
      case "deviated":
        return "bg-warning text-warning-foreground";
      case "paused":
        return "bg-danger text-danger-foreground";
      default:
        return "bg-muted";
    }
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case "on-time":
        return "On Time";
      case "delayed":
        return "Delayed";
      case "deviated":
        return "Route Changed";
      case "paused":
        return "Stopped";
      default:
        return "Unknown";
    }
  };

  const handleSosChange = async (value: number[]) => {
    setSosValue(value);
    if (value[0] >= 95) {
      setAlerts(["Emergency SOS activated! Help is on the way."]);

      // Trigger SOS notification
      await notificationService.showNotification(
        "sos",
        "EMERGENCY! Your location has been shared with emergency contacts and authorities."
      );

      toast({
        title: "🚨 Emergency SOS Activated",
        description: "Help is on the way!",
        variant: "destructive",
      });

      // Reset after activation
      setTimeout(() => setSosValue([0]), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Alert Banners */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {!isOnline && (
          <AlertBanner
            message="⚠️ NO NETWORK CONNECTION - Location tracking unavailable"
            variant="warning"
          />
        )}
        {alerts.map((alert, index) => (
          <AlertBanner key={index} message={alert} variant="warning" />
        ))}
      </div>

      {/* Map - Full Screen */}
      <div className="absolute inset-0">
        <MapView
          initialPosition={initialPosition || undefined}
          destinationPosition={destinationPosition || undefined}
          showGoogleMap={!!initialPosition}
        />
      </div>

      {/* Info Card - Desktop: Top Right, Mobile: Bottom */}
      <Card className="absolute md:top-4 md:right-4 bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:w-96 md:max-h-[calc(100vh-2rem)] overflow-y-auto z-10 md:rounded-lg rounded-t-2xl md:rounded-b-lg border-t md:border shadow-2xl">
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

          {/* ETA Countdown */}
          <div className="flex items-center justify-between py-2.5 px-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">ETA</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {timeRemaining} min
            </span>
          </div>

          {/* Ride Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge className={getStatusColor()}>{getStatusText()}</Badge>
          </div>

          {/* Pickup & Drop-off */}
          <div className="space-y-2.5">
            <div className="flex gap-2.5">
              <div className="mt-0.5">
                <div className="w-2 h-2 rounded-full bg-success ring-2 ring-success/20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium line-clamp-2">{from}</p>
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
                <p className="text-sm font-medium line-clamp-2">{to}</p>
              </div>
            </div>
          </div>

          {/* Alerts Badge */}
          {alerts.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-xs font-medium text-warning-foreground">
                {alerts[0]}
              </span>
            </div>
          )}

          {/* SOS Slider */}
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
                  {sosValue[0] < 95 ? "Slide to activate" : "Activating..."}
                </span>
                <span className="text-xs font-medium text-destructive">
                  {sosValue[0]}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackRide;
