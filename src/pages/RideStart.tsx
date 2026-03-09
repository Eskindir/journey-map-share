import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, User, X, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { debugLog } from "@/lib/config";
import {
  initiateTracking,
  buildTrackingUrl,
  reverseGeocode as apiReverseGeocode,
} from "@/lib/api";
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
  const [contacts, setContacts] = useState<string[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [supportsContactPicker, setSupportsContactPicker] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [rideId, setRideId] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [driverData, setDriverData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if Contact Picker API is supported
  useEffect(() => {
    const hasContactPicker =
      "contacts" in navigator && "ContactsManager" in window;
    setSupportsContactPicker(hasContactPicker);
  }, []);

  // Use validation service for GPS parsing
  const parseGPSCoordinates = validationParseGPS;

  // Use API service for reverse geocoding
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    return apiReverseGeocode({ latitude: lat, longitude: lon });
  };

  // Auto-detect location on mount and handle query string destination
  useEffect(() => {
    // Check for destination in query string
    const destinationParam =
      searchParams.get("destination") || searchParams.get("to");
    if (destinationParam) {
      console.log("Destination param:", destinationParam);
      setDestination(destinationParam);
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

  const addContact = () => {
    if (contactInput.trim() && !contacts.includes(contactInput.trim())) {
      setContacts([...contacts, contactInput.trim()]);
      setContactInput("");
    }
  };

  const pickContact = async () => {
    try {
      const props = ["name", "tel"];
      const opts = { multiple: true };

      // @ts-ignore - ContactsManager is not in TypeScript types yet
      const selectedContacts = await navigator.contacts.select(props, opts);

      selectedContacts.forEach((contact: any) => {
        if (contact.tel && contact.tel.length > 0) {
          const phoneNumber = contact.tel[0];
          const displayName =
            contact.name && contact.name.length > 0
              ? `${contact.name[0]} (${phoneNumber})`
              : phoneNumber;

          if (!contacts.includes(displayName)) {
            setContacts((prev) => [...prev, displayName]);
          }
        }
      });

      if (selectedContacts.length > 0) {
        toast({
          title: "Contacts Added",
          description: `${selectedContacts.length} contact(s) added successfully.`,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Error",
          description: "Unable to access contacts. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const removeContact = (contact: string) => {
    setContacts(contacts.filter((c) => c !== contact));
  };

  const shareRide = async () => {
    if (!currentLocation || !destination) {
      showError(
        ErrorCode.VALIDATION_ERROR,
        "Please enter your location and destination.",
      );
      return;
    }

    if (contacts.length === 0) {
      showError(
        ErrorCode.VALIDATION_ERROR,
        "Please add at least one contact to share with.",
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
      // Use rideId from query string only; send empty string if not present
      const newRideId = rideId || "";

      // Use driverId as deviceCode if deviceCode is not provided
      const finalDeviceCode = deviceCode || driverId || "UNKNOWN";

      // Call tracking API using the service
      const result = await initiateTracking({
        deviceCode: finalDeviceCode,
        rideId: newRideId,
        trackingRecipients: contacts.join(","),
        initialPosition,
        destinationPosition,
        isRideActive: true,
        driverIdFromDispatchService: finalDeviceCode,
        driverPlateNumber: plateNumber || "N/A",
        modelType: "Besec.Tracking.Models.TrackingRequest",
      });

      debugLog("Tracking initiated:", result);

      // Persist contacts for SOS feature
      if (result.trackingId) {
        sessionStorage.setItem(
          `sos-contacts-${result.trackingId}`,
          JSON.stringify(contacts),
        );
      }

      toast({
        title: "Tracking Started",
        description: "Your ride tracking has been initiated successfully.",
      });

      if (!result.trackingId || result.trackingId === "undefined") {
        showError(
          ErrorCode.API_ERROR,
          "Tracking started but no valid tracking ID was returned.",
        );
        return;
      }

      // Use API driver info, or fall back to URL-provided driverData
      let finalDriverInfo = result.driverInfo;
      if (!finalDriverInfo && driverData) {
        try {
          finalDriverInfo = JSON.parse(decodeURIComponent(driverData));
        } catch {
          // Ignore parse errors
        }
      }

      // Build tracking URL for the rider (sendingTrackingInfo=true)
      const riderTrackUrl = buildTrackingUrl({
        from: currentLocation,
        to: destination,
        trackingId: result.trackingId,
        driverId: driverId || undefined,
        driverInfo: finalDriverInfo,
        sendingTrackingInfo: true,
      });

      const message = `I'm taking a ride! Track me here: ${window.location.origin}/t/${result.trackingId}`;
      const smsBody = encodeURIComponent(message);
      const phoneNumbers = contacts.join(",");

      // Navigate rider to tracking view first
      navigate(riderTrackUrl);

      // Then open SMS app to send watcher link
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );

      if (isMobile) {
        setTimeout(() => {
          window.location.href = `sms:${phoneNumbers}?body=${smsBody}`;
        }, 500);
      }
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

        {/* Select Contacts */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Contacts</Label>

          {/* Show contact picker button only if supported */}
          {supportsContactPicker ? (
            <Button
              onClick={pickContact}
              variant="outline"
              className="w-full"
              type="button"
            >
              <User className="h-4 w-4 mr-2" />
              Pick from Phone Contacts
            </Button>
          ) : (
            /* Show manual entry only if contact picker not supported */
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter phone number"
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addContact()}
                  className="pl-9"
                />
              </div>
              <Button onClick={addContact} variant="outline">
                Add
              </Button>
            </div>
          )}

          {/* Contact List */}
          {contacts.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
              {contacts.map((contact, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="pl-3 pr-1 py-1"
                >
                  {contact}
                  <button
                    onClick={() => removeContact(contact)}
                    className="ml-2 hover:bg-background/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Share Button */}
        <Button
          onClick={shareRide}
          className="w-full h-12 text-base"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Starting Tracking..." : "Share Ride Link via SMS"}
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4">
          {isSubmitting
            ? "Please wait while we initiate your ride tracking..."
            : "Your phone will open the SMS app to complete the share."}
        </p>

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
