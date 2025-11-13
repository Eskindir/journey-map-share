import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, User, X, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const RideStart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [eta, setEta] = useState(20);
  const [contacts, setContacts] = useState<string[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Auto-detect location on mount and handle query string destination
  useEffect(() => {
    // Check for destination in query string
    const destinationParam =
      searchParams.get("destination") || searchParams.get("to");
    if (destinationParam) {
      setDestination(destinationParam);
    }

    // Auto-detect user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(
            `${position.coords.latitude.toFixed(
              4
            )}, ${position.coords.longitude.toFixed(4)}`
          );
          setIsLoadingLocation(false);
          toast({
            title: "Location Detected",
            description:
              "Your current location has been detected automatically.",
          });
        },
        (error) => {
          setIsLoadingLocation(false);
          toast({
            title: "Location Access Denied",
            description: "Please enter your location manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      setIsLoadingLocation(false);
    }
  }, [searchParams]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(
            `${position.coords.latitude.toFixed(
              4
            )}, ${position.coords.longitude.toFixed(4)}`
          );
          setIsLoadingLocation(false);
          toast({
            title: "Location Detected",
            description:
              "Your current location has been detected successfully.",
          });
        },
        (error) => {
          setIsLoadingLocation(false);
          toast({
            title: "Location Error",
            description:
              "Unable to detect your location. Please enter manually.",
            variant: "destructive",
          });
        }
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
    // Check if Contact Picker API is supported
    if ("contacts" in navigator && "ContactsManager" in window) {
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
            description: "Unable to access contacts. Please enter manually.",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Not Supported",
        description:
          "Contact picker is not available on this device. Please enter contacts manually.",
        variant: "destructive",
      });
    }
  };

  const removeContact = (contact: string) => {
    setContacts(contacts.filter((c) => c !== contact));
  };

  const shareRide = () => {
    if (!currentLocation || !destination) {
      toast({
        title: "Missing Information",
        description: "Please enter your location and destination.",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length === 0) {
      toast({
        title: "No Contacts Selected",
        description: "Please add at least one contact to share with.",
        variant: "destructive",
      });
      return;
    }

    const message = `I'm taking a ride! Track me here: ${
      window.location.origin
    }/track?from=${encodeURIComponent(currentLocation)}&to=${encodeURIComponent(
      destination
    )}&eta=${eta}`;
    const smsBody = encodeURIComponent(message);
    const phoneNumbers = contacts.join(",");

    // Navigate to tracking page
    navigate("/track");

    // Try to open SMS app (may not work in all browsers)
    window.location.href = `sms:${phoneNumbers}?body=${smsBody}`;
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
        </div>

        {/* ETA Selector */}
        <div className="space-y-2">
          <Label htmlFor="eta" className="text-base font-medium">
            Estimated Time of Arrival
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="eta"
              type="number"
              min="5"
              max="120"
              value={eta}
              onChange={(e) => setEta(parseInt(e.target.value) || 20)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </div>

        {/* Select Contacts */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Select Contacts</Label>

          {/* Pick from phone contacts */}
          <Button
            onClick={pickContact}
            variant="outline"
            className="w-full"
            type="button"
          >
            <User className="h-4 w-4 mr-2" />
            Pick from Phone Contacts
          </Button>

          {/* Manual entry */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Or enter phone number manually"
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
        <Button onClick={shareRide} className="w-full h-12 text-base" size="lg">
          Share Ride Link via SMS
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4">
          Your phone will open the SMS app to complete the share.
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
