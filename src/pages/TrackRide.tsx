import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Navigation, Clock, AlertTriangle, Phone, MessageSquare, Car } from "lucide-react";
import MapView from "@/components/MapView";
import AlertBanner from "@/components/AlertBanner";
import driverPhoto from "@/assets/driver-photo.jpg";

const TrackRide = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [rideStatus, setRideStatus] = useState<"on-time" | "delayed" | "deviated" | "paused">("on-time");
  const [alerts, setAlerts] = useState<string[]>([]);

  const from = searchParams.get('from') || 'Current Location';
  const to = searchParams.get('to') || 'Destination';
  const eta = parseInt(searchParams.get('eta') || '20');

  useEffect(() => {
    setTimeRemaining(eta);
    
    // Simulate countdown
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          navigate('/ride-end');
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    // Simulate status changes for demo
    const statusTimeout = setTimeout(() => {
      const statuses: Array<"on-time" | "delayed" | "deviated" | "paused"> = ["on-time", "delayed", "deviated"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setRideStatus(randomStatus);
      
      if (randomStatus === "deviated") {
        setAlerts(["Route deviation detected"]);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(statusTimeout);
    };
  }, [eta, navigate]);

  const getStatusColor = () => {
    switch (rideStatus) {
      case "on-time": return "bg-success text-success-foreground";
      case "delayed": return "bg-warning text-warning-foreground";
      case "deviated": return "bg-warning text-warning-foreground";
      case "paused": return "bg-danger text-danger-foreground";
      default: return "bg-muted";
    }
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case "on-time": return "On Time";
      case "delayed": return "Delayed";
      case "deviated": return "Route Changed";
      case "paused": return "Stopped";
      default: return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Alert Banners */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {alerts.map((alert, index) => (
          <AlertBanner key={index} message={alert} variant="warning" />
        ))}
      </div>

      {/* Map - Full Screen */}
      <div className="absolute inset-0">
        <MapView />
      </div>

      {/* Info Card - Desktop: Top Right, Mobile: Bottom */}
      <Card className="absolute md:top-4 md:right-4 bottom-0 left-0 right-0 md:left-auto md:bottom-auto md:w-96 md:max-h-[calc(100vh-2rem)] overflow-y-auto z-10 md:rounded-lg rounded-t-2xl md:rounded-b-lg border-t md:border shadow-2xl">
        <CardContent className="p-4 space-y-4">
          {/* Driver Info */}
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-muted overflow-hidden ring-2 ring-border">
                <img 
                  src={driverPhoto}
                  alt="Driver" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-success text-success-foreground rounded-full p-1">
                <Star className="h-3 w-3 fill-current" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base">John Driver</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Star className="h-3 w-3 fill-warning text-warning" />
                    <span className="font-medium">4.8</span>
                    <span>• 328 rides</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Car Info */}
              <div className="mt-2 flex items-center gap-2 text-xs bg-muted rounded-md p-2">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">Toyota Camry</span>
                  <span className="text-muted-foreground"> • ABC-1234</span>
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
            <span className="text-lg font-bold text-primary">{timeRemaining} min</span>
          </div>

          {/* Ride Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
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
              <span className="text-xs font-medium text-warning-foreground">{alerts[0]}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackRide;
