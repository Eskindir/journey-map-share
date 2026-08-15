import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Bell } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { debugLog } from "@/lib/config";
import {
  initiateTracking,
  buildTrackingUrl,
  reverseGeocode as apiReverseGeocode,
  sendTrackingLink,
} from "@/lib/api";
import {
  storeSosRecipients,
  storeRememberedRecipients,
  getRememberedRecipients,
  type SosRecipient,
} from "@/lib/sosRecipients";
import { SosContactsSheet } from "@/components/SosContactsSheet";
import { parseGPSCoordinates as validationParseGPS } from "@/lib/validation";
import {
  handleApiError,
  handleGeolocationError,
  showError,
  ErrorCode,
} from "@/lib/errors";

const RideStart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [currentLocationAddress, setCurrentLocationAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [eta, setEta] = useState(20);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [driverId, setDriverId] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [rideId, setRideId] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [driverData, setDriverData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riderFirstName, setRiderFirstName] = useState("");
  const [riderLastName, setRiderLastName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [isFromTracking, setIsFromTracking] = useState(false);
  const [preTrackingId, setPreTrackingId] = useState("");
  const [locationProgress, setLocationProgress] = useState(0);

  // Friends & family to alert by SMS if the rider triggers SOS. Captured in the
  // guided share sheet, pre-filled from the rider's last-used (remembered)
  // contacts, then stored client-side on share and sent to the backend only when
  // SOS fires.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rememberedContacts] = useState<SosRecipient[]>(() =>
    getRememberedRecipients()
  );

  // Use validation service for GPS parsing
  const parseGPSCoordinates = validationParseGPS;

  // Use API service for reverse geocoding
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    return apiReverseGeocode({ latitude: lat, longitude: lon });
  };

  // Auto-detect location on mount and handle query string destination
  useEffect(() => {
    // Check for destination address from URL first (from /start redirect)
    const destAddressFromUrl = searchParams.get("destinationAddress");

    // Check for destination in query string
    const destinationParam =
      searchParams.get("destination") || searchParams.get("to");
    if (destinationParam) {
      console.log("Destination param:", destinationParam);
      setDestination(destinationParam);

      if (destAddressFromUrl) {
        // Use the address directly from URL - no need to reverse geocode
        console.log("Using destination address from URL:", destAddressFromUrl);
        setDestinationAddress(destAddressFromUrl);
      } else {
        // Reverse geocode destination if it's coordinates
        const coords = parseGPSCoordinates(destinationParam);
        console.log("Parsed destination coords:", coords);
        if (coords) {
          reverseGeocode(coords.latitude, coords.longitude).then((address) => {
            console.log("Setting destination address:", address);
            setDestinationAddress(address);
          });
        }
      }
    } else if (destAddressFromUrl) {
      setDestinationAddress(destAddressFromUrl);
    }

    // Check for driverId in query string
    const driverIdParam = searchParams.get("driverId");
    if (driverIdParam) {
      setDriverId(driverIdParam);
    }

    // Check for deviceCode in query string
    const deviceCodeParam = searchParams.get("deviceCode");
    if (deviceCodeParam) {
      setDeviceCode(deviceCodeParam);
    }

    // Check for rideId in query string
    const rideIdParam = searchParams.get("rideId");
    if (rideIdParam) {
      setRideId(rideIdParam);
    }

    // Check for plateNumber in query string
    const plateNumberParam = searchParams.get("plateNumber");
    if (plateNumberParam) {
      setPlateNumber(plateNumberParam);
    }

    // Check for driverData in query string
    const driverDataParam = searchParams.get("driverData");
    if (driverDataParam) {
      setDriverData(driverDataParam);
    }

    // Check for rider info in query string
    const riderFirstNameParam = searchParams.get("riderFirstName");
    if (riderFirstNameParam) {
      setRiderFirstName(riderFirstNameParam);
    }
    const riderLastNameParam = searchParams.get("riderLastName");
    if (riderLastNameParam) {
      setRiderLastName(riderLastNameParam);
    }
    const riderPhoneParam = searchParams.get("riderPhone");
    if (riderPhoneParam) {
      setRiderPhone(riderPhoneParam);
    }

    // Check for ETA in query string
    const etaParam = searchParams.get("eta");
    if (etaParam) {
      const parsedEta = parseInt(etaParam, 10);
      if (!isNaN(parsedEta)) {
        setEta(parsedEta);
      }
    }
        // Check for pre-initiated tracking
    const fromTrackingParam = searchParams.get("fromTracking");
    if (fromTrackingParam === "true") {
      setIsFromTracking(true);
    }
    const trackingIdParam = searchParams.get("trackingId");
    if (trackingIdParam) {
      setPreTrackingId(trackingIdParam);
    }

    // Auto-detect user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordsString = `${position.coords.latitude.toFixed(
            4,
          )}, ${position.coords.longitude.toFixed(4)}`;
          setCurrentLocation(coordsString);

          // Get address for current location
          const address = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );
          setCurrentLocationAddress(address);
          setIsLoadingLocation(false);

          toast({
            title: "Location Detected",
            description: address,
          });
        },
        (error) => {
          setIsLoadingLocation(false);
          handleGeolocationError(error);
        },
      );
    } else {
      setIsLoadingLocation(false);
    }
  }, [searchParams]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordsString = `${position.coords.latitude.toFixed(
            4,
          )}, ${position.coords.longitude.toFixed(4)}`;
          setCurrentLocation(coordsString);

          // Get address for current location
          const address = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
          );
          setCurrentLocationAddress(address);
          setIsLoadingLocation(false);

          toast({
            title: "Location Detected",
            description: address,
          });
        },
        (error) => {
          setIsLoadingLocation(false);
          handleGeolocationError(error);
        },
      );
    }
  };

  // Loading progress bar effect
  useEffect(() => {
    if (!isLoadingLocation) {
      setLocationProgress(100);
      return;
    }
    setLocationProgress(0);
    const interval = setInterval(() => {
      setLocationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isLoadingLocation]);

  // Validate the trip details, then open the guided sheet to capture emergency
  // contacts before the actual share. Contacts are hard-required, so the share
  // itself happens in shareRide once the sheet confirms at least one.
  const handleShareClick = () => {
    if (!currentLocation || !destination) {
      showError(
        ErrorCode.VALIDATION_ERROR,
        "Please enter your location and destination.",
      );
      return;
    }

    if (!parseGPSCoordinates(currentLocation) || !parseGPSCoordinates(destination)) {
      showError(ErrorCode.INVALID_COORDINATES);
      return;
    }

    setSheetOpen(true);
  };

  const shareRide = async (emergencyContacts: SosRecipient[]) => {
    if (!currentLocation || !destination) {
      showError(
        ErrorCode.VALIDATION_ERROR,
        "Please enter your location and destination.",
      );
      return;
    }

    // Parse GPS coordinates using validation service
    const initialPosition = parseGPSCoordinates(currentLocation);
    const destinationPosition = parseGPSCoordinates(destination);

    if (!initialPosition || !destinationPosition) {
      showError(ErrorCode.INVALID_COORDINATES);
      return;
    }

    setIsSubmitting(true);

    try {
      let trackingIdToUse: string;
      let finalDriverInfoToUse: any = null;

      if (isFromTracking && preTrackingId) {
        // Pre-initiated flow: tracking already exists, skip initiateTracking
        trackingIdToUse = preTrackingId;
        debugLog("Using pre-initiated tracking:", preTrackingId);

        // Use URL-provided driverData
        if (driverData) {
          try {
            finalDriverInfoToUse = JSON.parse(decodeURIComponent(driverData));
          } catch {
            // Ignore parse errors
          }
        }

        toast({
          title: "Tracking Started",
          description: "Your ride tracking has been initiated successfully.",
        });
      } else {
        // Normal flow: initiate new tracking
        const newRideId = rideId || "";
        const finalDeviceCode = deviceCode || driverId || "UNKNOWN";

        const result = await initiateTracking({
          deviceCode: finalDeviceCode,
          rideId: newRideId,
          trackingRecipients: "",
          initialPosition,
          destinationPosition,
          isRideActive: true,
          driverIdFromDispatchService: finalDeviceCode,
          driverPlateNumber: plateNumber || "N/A",
          modelType: "Besec.Tracking.Models.TrackingRequest",
        });

        debugLog("Tracking initiated:", result);

        if (!result.trackingId || result.trackingId === "undefined") {
          showError(
            ErrorCode.API_ERROR,
            "Tracking started but no valid tracking ID was returned.",
          );
          return;
        }

        trackingIdToUse = result.trackingId;

        toast({
          title: "Tracking Started",
          description: "Your ride tracking has been initiated successfully.",
        });

        finalDriverInfoToUse = result.driverInfo;
        if (!finalDriverInfoToUse && driverData) {
          try {
            finalDriverInfoToUse = JSON.parse(decodeURIComponent(driverData));
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Persist the rider's chosen emergency contacts (friends & family) against
      // this tracking id, so TrackRide can text them if SOS is triggered. Also
      // remember them device-wide to pre-fill the next ride's share sheet.
      storeSosRecipients(trackingIdToUse, emergencyContacts);
      storeRememberedRecipients(emergencyContacts);

      // New spec: the tracking-link recipient IS the SOS contact. Text the live link
      // to those contacts now, at initiation. Best-effort — never blocks the ride.
      await sendTrackingLink({
        trackingId: trackingIdToUse,
        recipients: emergencyContacts.map((c) => c.phone),
        riderName: `${riderFirstName} ${riderLastName}`.trim() || undefined,
      });

      // Build tracking URL for the rider (sendingTrackingInfo=true)
      const riderTrackUrl = buildTrackingUrl({
        from: currentLocation,
        to: destination,
        trackingId: trackingIdToUse,
        driverId: driverId || deviceCode || finalDriverInfoToUse?.driverId || preTrackingId || undefined,
        driverInfo: finalDriverInfoToUse,
        sendingTrackingInfo: true,
      });

      // Navigate rider to tracking view. (The manual "share my ride" gesture was
      // removed — instead the /t/{trackingId} link is texted to the SOS contacts at
      // initiation above, and again if an SOS is later triggered.)
      navigate(riderTrackUrl);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="text-center pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">
            Start Your Ride Safely
          </h1>
        </header>

        {/* Current Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-base font-medium">
            Your Location
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder={
                  isLoadingLocation
                    ? "Detecting location..."
                    : "Enter your location"
                }
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="pl-9"
                disabled={isLoadingLocation}
              />
            </div>
            <Button
              onClick={detectLocation}
              variant="outline"
              size="icon"
              disabled={isLoadingLocation}
            >
              <Navigation
                className={`h-4 w-4 ${
                  isLoadingLocation ? "animate-pulse" : ""
                }`}
              />
            </Button>
          </div>
          {currentLocationAddress && (
            <p className="text-sm text-muted-foreground pl-1">
              {currentLocationAddress}
            </p>
          )}
        </div>

        {/* Location Progress Bar */}
          {isLoadingLocation && (
            <Progress value={locationProgress} className="h-1.5" />
          )}

        {/* Rider Information (read-only) */}
        {(riderFirstName || riderLastName || riderPhone) && (
          <div className="space-y-2">
            <Label className="text-base font-medium">Rider Information</Label>
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              {(riderFirstName || riderLastName) && (
                <Input
                  value={`${riderFirstName} ${riderLastName}`.trim()}
                  disabled
                  className="bg-muted"
                />
              )}
              {riderPhone && (
                <Input value={riderPhone} disabled className="bg-muted" />
              )}
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination" className="text-base font-medium">
            Where are you going?
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="destination"
              placeholder="Enter destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-9"
            />
          </div>
          {destinationAddress && (
            <p className="text-sm text-muted-foreground pl-1">
              {destinationAddress}
            </p>
          )}
        </div>

        {/* Estimated Time of Arrival */}
        <div className="space-y-2">
          <Label htmlFor="eta" className="text-base font-medium">
            Estimated Time (minutes)
          </Label>
          <Input
            id="eta"
            type="number"
            placeholder="Enter ETA in minutes"
            value={eta || ""}
            onChange={(e) => setEta(parseInt(e.target.value, 10) || 0)}
            min={1}
          />
        </div>

        {/* Driver ID (readonly if from query string) */}
        {driverId && (
          <div className="space-y-2">
            <Label htmlFor="driverId" className="text-base font-medium">
              Driver ID
            </Label>
            <Input
              id="driverId"
              value={driverId}
              disabled
              className="bg-muted"
            />
          </div>
        )}

        {/* Start Tracking — opens the guided sheet to capture emergency contacts */}
        <Button
          onClick={handleShareClick}
          className="w-full h-12 text-base"
          size="lg"
          disabled={isSubmitting}
        >
          <Navigation className="h-5 w-5 mr-2" />
          {isSubmitting ? "Starting Tracking..." : "Start Tracking"}
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4">
          {isSubmitting
            ? "Please wait while we initiate your ride tracking..."
            : "We'll ask who to alert on SOS, then start tracking your ride."}
        </p>

        {/* Guided emergency-contacts step (shown on Share) */}
        <SosContactsSheet
          open={sheetOpen}
          initialContacts={rememberedContacts}
          isSubmitting={isSubmitting}
          onConfirm={(contacts) => shareRide(contacts)}
          onCancel={() => setSheetOpen(false)}
        />

        {/* Test Notifications Link */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="h-4 w-4 mr-2" />
            Test Notification Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RideStart;
