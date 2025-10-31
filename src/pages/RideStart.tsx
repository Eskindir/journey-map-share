import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, User, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const RideStart = () => {
  const navigate = useNavigate();
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [eta, setEta] = useState(20);
  const [contacts, setContacts] = useState<string[]>([]);
  const [contactInput, setContactInput] = useState("");

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          toast({
            title: "Location Detected",
            description: "Your current location has been detected successfully.",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to detect your location. Please enter manually.",
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

  const removeContact = (contact: string) => {
    setContacts(contacts.filter(c => c !== contact));
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

    const message = `I'm taking a ride! Track me here: ${window.location.origin}/track?from=${encodeURIComponent(currentLocation)}&to=${encodeURIComponent(destination)}&eta=${eta}`;
    const smsBody = encodeURIComponent(message);
    const phoneNumbers = contacts.join(',');
    
    // Navigate to tracking page
    navigate('/track');
    
    // Try to open SMS app (may not work in all browsers)
    window.location.href = `sms:${phoneNumbers}?body=${smsBody}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="text-center pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">Start Your Ride Safely</h1>
        </header>

        {/* Current Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-base font-medium">Your Location</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Enter your location"
                value={currentLocation}
                onChange={(e) => setCurrentLocation(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={detectLocation} variant="outline" size="icon">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label htmlFor="destination" className="text-base font-medium">Where are you going?</Label>
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
          <Label htmlFor="eta" className="text-base font-medium">Estimated Time of Arrival</Label>
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter phone number or name"
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addContact()}
                className="pl-9"
              />
            </div>
            <Button onClick={addContact} variant="outline">Add</Button>
          </div>

          {/* Contact List */}
          {contacts.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
              {contacts.map((contact, index) => (
                <Badge key={index} variant="secondary" className="pl-3 pr-1 py-1">
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
        >
          Share Ride Link via SMS
        </Button>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4">
          Your phone will open the SMS app to complete the share.
        </p>
      </div>
    </div>
  );
};

export default RideStart;
