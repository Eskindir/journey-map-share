import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Car,
  MapPin,
  ShieldAlert,
  Loader2,
  Share2,
} from "lucide-react";
import MapView from "@/components/MapView";
import { useToast } from "@/hooks/use-toast";
import { debugLog } from "@/lib/config";
import {
  getSOSStatus,
  reverseGeocode as apiReverseGeocode,
  snapPositionWithHistory,
  type Position,
} from "@/lib/api";
import { appendPositionIfNew } from "@/lib/geo/locationHistory";
import { positionsEqual } from "@/lib/geo/distance";

const SOSEmergency = () => {
  const { sosId } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [locationHistory, setLocationHistory] = useState<Position[]>([]);
  const locationHistoryRef = useRef<Position[]>([]);
  const lastServerPositionRef = useRef<Position | null>(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sosTime, setSosTime] = useState("");

  useEffect(() => {
    locationHistoryRef.current = locationHistory;
  }, [locationHistory]);

  // Reverse geocode helper
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const address = await apiReverseGeocode({ latitude: lat, longitude: lon });
    if (address.includes(",") && !address.includes(" ")) {
      return "";
    }
    return address;
  };

  // Poll SOS status
  useEffect(() => {
    if (!sosId) {
      setError("Missing SOS ID");
      setLoading(false);
      return;
    }

    const fetchSOSStatus = async () => {
      try {
        debugLog("Polling SOS status for:", sosId);
        const status = await getSOSStatus(sosId);

        if (!status) {
          setError("Unable to retrieve SOS information");
          setLoading(false);
          return;
        }

        setDriverName(status.driverName);
        setDriverPhone(status.driverPhone);
        setPlateNumber(status.driverPlateNumber);
        setVehicleModel(status.vehicleModel);
        setIsActive(status.isActive);

        if (status.createdAt) {
          try {
            const date = new Date(status.createdAt);
            setSosTime(date.toLocaleTimeString());
          } catch {
            setSosTime(status.createdAt);
          }
        }

        if (status.driverPosition) {
          const rawPosition = status.driverPosition;

          if (
            !lastServerPositionRef.current ||
            !positionsEqual(lastServerPositionRef.current, rawPosition)
          ) {
            lastServerPositionRef.current = rawPosition;

            const snappedPosition = await snapPositionWithHistory(
              locationHistoryRef.current.slice(-9),
              rawPosition,
            );

            setCurrentPosition(snappedPosition);
            setLocationHistory((prev) =>
              appendPositionIfNew(prev, snappedPosition),
            );

            debugLog("SOS position updated:", {
              raw: rawPosition,
              snapped: snappedPosition,
            });
          } else {
            debugLog("SOS poll: position unchanged, skipping snap");
          }
        }

        setLoading(false);
      } catch (err) {
        debugLog("Error fetching SOS status:", err);
        if (loading) {
          setError("Failed to load SOS information");
          setLoading(false);
        }
      }
    };

    fetchSOSStatus();
    const interval = setInterval(fetchSOSStatus, 10000);
    return () => clearInterval(interval);
  }, [sosId]);

  // Reverse geocode when position changes
  useEffect(() => {
    if (currentPosition) {
      reverseGeocode(currentPosition.latitude, currentPosition.longitude).then(
        (address) => {
          if (address) setCurrentAddress(address);
        },
      );
    }
  }, [currentPosition]);

  const handleShareLocation = async () => {
    if (!currentPosition) return;
    const mapsUrl = `https://maps.google.com/?q=${currentPosition.latitude},${currentPosition.longitude}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Emergency - Driver Location",
          text: `EMERGENCY: Driver ${driverName} needs help! Location: ${currentAddress || `${currentPosition.latitude}, ${currentPosition.longitude}`}`,
          url: mapsUrl,
        });
      } else {
        await navigator.clipboard.writeText(mapsUrl);
        toast({
          title: "Location copied",
          description: "Driver location link copied to clipboard.",
        });
      }
    } catch {
      // User cancelled share
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">Loading emergency information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* SOS Banner - Always visible */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center font-bold text-sm shadow-md animate-pulse">
          <ShieldAlert className="h-4 w-4 inline-block mr-2" />
          EMERGENCY SOS - Driver needs immediate help!
          {sosTime && <span className="font-normal ml-2">Triggered at {sosTime}</span>}
        </div>
        {!isActive && (
          <div className="bg-muted text-muted-foreground px-4 py-2 text-center text-sm">
            This SOS alert has been resolved.
          </div>
        )}
      </div>

      {/* Map - Full Screen */}
      <div className="absolute inset-0 pb-[55vh] md:pb-0">
        <MapView
          initialPosition={currentPosition || undefined}
          locationHistory={locationHistory}
          showGoogleMap={!!currentPosition}
          driverMarker="car"
        />
      </div>

      {/* Info Card */}
      <Card className="absolute md:top-16 md:right-4 bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:w-96 md:max-h-[calc(100vh-5rem)] max-h-[55vh] overflow-y-auto z-10 md:rounded-lg rounded-t-2xl md:rounded-b-lg border-t md:border shadow-2xl">
        <CardContent className="p-4 space-y-4">
          {/* Emergency Actions */}
          <div className="space-y-2">
            <Button
              variant="destructive"
              className="w-full text-base font-bold py-6"
              onClick={() => (window.location.href = "tel:911")}
            >
              <Phone className="h-5 w-5 mr-2" />
              Call Emergency Services (911)
            </Button>
            {driverPhone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = `tel:${driverPhone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Driver ({driverPhone})
              </Button>
            )}
          </div>

          {/* Driver Info */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Driver Information</h3>
            <div className="space-y-2">
              {driverName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{driverName}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm bg-muted rounded-md p-2">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{vehicleModel || "Unknown vehicle"}</span>
                <span className="text-muted-foreground"> {plateNumber ? `\u2022 ${plateNumber}` : ""}</span>
              </div>
            </div>
          </div>

          {/* Current Location */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Last Known Location</h3>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                {currentAddress ? (
                  <p className="text-sm font-medium">{currentAddress}</p>
                ) : currentPosition ? (
                  <p className="text-sm font-medium">
                    {currentPosition.latitude.toFixed(6)}, {currentPosition.longitude.toFixed(6)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Location unavailable</p>
                )}
              </div>
            </div>
          </div>

          {/* Share Location */}
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleShareLocation}
              disabled={!currentPosition}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Driver Location
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SOSEmergency;
