import { useState, useEffect } from "react";
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
  reverseGeocode as apiReverseGeocode,
  type Position,
  type CloseTrackingRequest,
} from "@/lib/api";
import { parseGPSCoordinates } from "@/lib/validation";
import { handleApiError, handleGeolocationError } from "@/lib/errors";

const TrackRide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sosValue, setSosValue] = useState([0]);
  const [sosActivated, setSosActivated] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isEndingRide, setIsEndingRide] = useState(false);
  const [showEndRideDialog, setShowEndRideDialog] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationHistory, setLocationHistory] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [currentLocationAddress, setCurrentLocationAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const { toast } = useToast();

  const from = searchParams.get("from") || "Current Location";
  const to = searchParams.get("to") || "Destination";
  const sendingTrackingInfo =
    searchParams.get("sendingTrackingInfo") === "true";
  const trackingId = searchParams.get("trackingId") || "";
  const driverId = searchParams.get("driverId") || "";

  // Parse driver info from query string
  const driverDataParam = searchParams.get("driverData");
  console.log("Raw driverData param:", driverDataParam);

  const driverInfo = (() => {
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
  })();
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

  // Parse GPS coordinates using validation service
  const initialPosition = parseGPSCoordinates(from);
  const destinationPosition = parseGPSCoordinates(to);

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
          const endedRideStatuses = [
            "ArrivedSafely",
            "RideEndedByDriver",
            "Cancelled",
          ];

          if (
            !latestLocation.isRideActive ||
            endedRideStatuses.includes(latestLocation.rideStatus)
          ) {
            const params = new URLSearchParams({
              trackingId,
              status: latestLocation.rideStatus,
              viewerType: "watcher",
            });

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

            navigate(`/ride-end?${params.toString()}`);
            return;
          }

          // Detect SOS status from backend
          if (latestLocation.rideStatus === "SOS") {
            setSosActivated(true);
          }

          const newPosition = latestLocation.position;

          // Update current position
          setCurrentPosition(newPosition);

          // Add to location history if it's a new position
          setLocationHistory((prev) => {
            const lastPos = prev[prev.length - 1];
            if (
              !lastPos ||
              lastPos.latitude !== newPosition.latitude ||
              lastPos.longitude !== newPosition.longitude
            ) {
              return [...prev, newPosition];
            }
            return prev;
          });

          debugLog("Position updated:", newPosition);
        }
      } catch (error) {
        // Log but don't show error to user for polling failures
        // The retry logic in the API client will handle transient errors
        debugLog("Error fetching location update:", error);
      }
    };

    // Fetch immediately on mount
    fetchLocationUpdate();

    // Then fetch every 15 seconds
    const interval = setInterval(fetchLocationUpdate, 15000);

    return () => clearInterval(interval);
  }, [
    sendingTrackingInfo,
    trackingId,
    navigate,
    driverName,
    carPlate,
    carInfo,
  ]);

  // Send tracking info at intervals if enabled
  useEffect(() => {
    if (!sendingTrackingInfo || !trackingId || !driverId) {
      console.log("Tracking info sending disabled or missing params:", {
        sendingTrackingInfo,
        trackingId,
        driverId,
      });
      return;
    }

    const sendLocationUpdateFn = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newPosition: Position = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };

            debugLog("Sending location update:", {
              trackingId,
              driverId,
              newPosition,
            });

            // Update current position on the map
            setCurrentPosition(newPosition);

            // Add to location history if it's a new position
            setLocationHistory((prev) => {
              const lastPos = prev[prev.length - 1];
              if (
                !lastPos ||
                lastPos.latitude !== newPosition.latitude ||
                lastPos.longitude !== newPosition.longitude
              ) {
                return [...prev, newPosition];
              }
              return prev;
            });

            try {
              await sendLocationUpdate(trackingId, driverId, newPosition, sosActivated ? "SOS" : "Ongoing");
              debugLog("Location update sent successfully");
            } catch (error) {
              // Log but continue - the retry logic will handle transient errors
              debugLog("Error sending location update:", error);
            }
          },
          (error) => {
            handleGeolocationError(error);
          },
        );
      }
    };

    // Send immediately on mount
    sendLocationUpdateFn();

    // Then send every 15 seconds
    const interval = setInterval(sendLocationUpdateFn, 15000);

    return () => clearInterval(interval);
  }, [sendingTrackingInfo, trackingId, driverId, sosActivated]);

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


  const handleSosChange = (value: number[]) => {
    setSosValue(value);
    if (value[0] >= 95) {
      setSosActivated(true);
      setSosValue([0]);

      // Read contacts from sessionStorage
      const storedContacts = sessionStorage.getItem(
        `sos-contacts-${trackingId}`,
      );
      const contacts: string[] = storedContacts
        ? JSON.parse(storedContacts)
        : [];

      // Build SOS message with current location
      let sosMessage = "EMERGENCY SOS! I need help immediately!";
      if (currentPosition) {
        sosMessage += ` My location: https://maps.google.com/?q=${currentPosition.latitude},${currentPosition.longitude}`;
      }

      // Open SMS app with contacts
      if (contacts.length > 0) {
        const phoneNumbers = contacts.join(",");
        window.location.href = `sms:${phoneNumbers}?body=${encodeURIComponent(sosMessage)}`;
      }
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
          await sendLocationUpdate(trackingId, driverId, currentPosition, "ArrivedSafely");
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

      if (to) {
        params.set("destination", to);
      }

      // Add optional params with encoding for special characters
      if (driverPhotoUrl && driverPhotoUrl !== driverPhoto) {
        params.set("pictureUrl", encodeURIComponent(driverPhotoUrl));
      }

      navigate(`/ride-end?${params.toString()}`);
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
          <div className="bg-destructive text-destructive-foreground px-4 py-3 text-center font-bold text-sm shadow-md animate-pulse">
            SOS ACTIVATED - React immediately! Emergency contacts have
            been notified.
          </div>
        )}
      </div>
      {/* Map - Full Screen */}
      <div className="absolute inset-0 pb-[60vh] md:pb-0">
        <MapView
          initialPosition={currentPosition || initialPosition || undefined}
          destinationPosition={destinationPosition || undefined}
          locationHistory={locationHistory}
          showGoogleMap={!!(currentPosition || initialPosition)}
        />
      </div>

      {/* Info Card - Desktop: Top Right, Mobile: Bottom */}
      <Card className="absolute md:top-4 md:right-4 bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:w-96 md:max-h-[calc(100vh-2rem)] max-h-[60vh] overflow-y-auto z-10 md:rounded-lg rounded-t-2xl md:rounded-b-lg border-t md:border shadow-2xl">
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
                  {sosValue[0] < 95 ? "Slide to activate" : "Activating..."}
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
