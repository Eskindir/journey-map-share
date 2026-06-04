import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { getTrackingInfo } from "@/lib/api";
import { debugLog } from "@/lib/config";
import { captureRiderKeyFromQuery } from "@/lib/riderKey";

const StartRedirect = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trackingId) {
      setError("Missing tracking ID");
      return;
    }

    // Capture the rider's video-decryption key from the tracking link
    // (?rk=...&cid=...) before anything else, keyed by confirmation id.
    captureRiderKeyFromQuery(window.location.search);

    const fetchAndRedirect = async () => {
      try {
        debugLog("Fetching tracking info for start redirect:", trackingId);
        const info = await getTrackingInfo(trackingId);

        const params = new URLSearchParams();

        // Destination
        if (info.destinationPosition.latitude !== 0 || info.destinationPosition.longitude !== 0) {
          params.set("destination", `${info.destinationPosition.latitude},${info.destinationPosition.longitude}`);
        }

        // Device/driver IDs
        if (info.deviceCode) {
          params.set("driverId", info.deviceCode);
          params.set("deviceCode", info.deviceCode);
        }

        if (info.rideId) {
          params.set("rideId", info.rideId);
        }

        // Driver info
        if (info.driverInfo) {
          params.set("plateNumber", info.driverInfo.plateNumber);
          params.set("driverData", encodeURIComponent(JSON.stringify(info.driverInfo)));
        }

        // Contacts
        if (info.trackingRecipients) {
          params.set("contacts", info.trackingRecipients);
        }

        // Rider info
        if (info.riderInfo) {
          params.set("riderFirstName", info.riderInfo.firstName);
          params.set("riderLastName", info.riderInfo.lastName);
          params.set("riderPhone", info.riderInfo.phoneNumber);
        }

        // Pre-initiated tracking flag
        params.set("trackingId", trackingId);
        params.set("fromTracking", "true");

        navigate(`/?${params.toString()}`, { replace: true });
      } catch (err) {
        debugLog("Error fetching tracking info:", err);
        setError("Failed to load ride information. Please try again.");
      }
    };

    fetchAndRedirect();
  }, [trackingId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Unable to Load Ride</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              onClick={() => {
                setError("");
                if (trackingId) {
                  window.location.reload();
                }
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading ride information...</p>
      </div>
    </div>
  );
};

export default StartRedirect;
