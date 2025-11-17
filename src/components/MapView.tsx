import { useEffect, useState, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

interface MapViewProps {
  initialPosition?: { latitude: number; longitude: number };
  destinationPosition?: { latitude: number; longitude: number };
  showGoogleMap?: boolean;
}

const MapView = ({
  initialPosition,
  destinationPosition,
  showGoogleMap = false,
}: MapViewProps) => {
  const [progress, setProgress] = useState(0);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Simulate journey progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 5;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Google Maps configuration
  const mapContainerStyle = {
    width: "100%",
    height: "100%",
  };

  const defaultCenter = {
    lat: initialPosition?.latitude || 9.032,
    lng: initialPosition?.longitude || 38.7469,
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
  };

  // If Google Map should be shown and we have initial position
  if (showGoogleMap && initialPosition) {
    return (
      <div className="relative w-full h-full">
        <LoadScript googleMapsApiKey="AIzaSyDABp7Bg9ODZSE3oFcJ5LpdBz2wLqP7PRg">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={15}
            options={mapOptions}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            {/* Initial Position Marker */}
            <Marker
              position={{
                lat: initialPosition.latitude,
                lng: initialPosition.longitude,
              }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                scaledSize: { width: 64, height: 64 },
              }}
              title="Current Location"
            />

            {/* Destination Marker (if provided) */}
            {destinationPosition && (
              <Marker
                position={{
                  lat: destinationPosition.latitude,
                  lng: destinationPosition.longitude,
                }}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: { width: 64, height: 64 },
                }}
                title="Destination"
              />
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    );
  }

  // Calculate current position based on progress (for simulated map)
  const startX = 20;
  const startY = 70;
  const endX = 80;
  const endY = 30;

  const currentX = startX + (endX - startX) * (progress / 100);
  const currentY = startY + (endY - startY) * (progress / 100);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-muted/30 via-muted/10 to-background overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Street lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="0"
          y1="30%"
          x2="100%"
          y2="30%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <line
          x1="0"
          y1="60%"
          x2="100%"
          y2="60%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <line
          x1="20%"
          y1="0"
          x2="20%"
          y2="100%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="hsl(var(--border))"
          strokeWidth="3"
        />
        <line
          x1="80%"
          y1="0"
          x2="80%"
          y2="100%"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
      </svg>

      {/* Route path */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1A73E8" stopOpacity="0.3" />
            <stop
              offset={`${progress}%`}
              stopColor="#1A73E8"
              stopOpacity="0.8"
            />
            <stop
              offset={`${progress}%`}
              stopColor="transparent"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Full route (faded) */}
        <line
          x1={`${startX}%`}
          y1={`${startY}%`}
          x2={`${endX}%`}
          y2={`${endY}%`}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeOpacity="0.2"
          strokeDasharray="5,5"
        />

        {/* Animated route (colored) */}
        <line
          x1={`${startX}%`}
          y1={`${startY}%`}
          x2={`${currentX}%`}
          y2={`${currentY}%`}
          stroke="#1A73E8"
          strokeWidth="4"
          strokeOpacity="0.8"
          strokeLinecap="round"
        />
      </svg>

      {/* Start marker */}
      <div
        className="absolute z-10 transition-all duration-300"
        style={{
          left: `${startX}%`,
          top: `${startY}%`,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="relative">
          <div className="bg-success text-success-foreground rounded-full p-2 shadow-lg">
            <Navigation className="w-5 h-5 fill-current" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-success/30 rounded-full blur-sm" />
        </div>
      </div>

      {/* Current position marker */}
      <div
        className="absolute z-10 transition-all duration-1000"
        style={{
          left: `${currentX}%`,
          top: `${currentY}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative">
          {/* Pulsing circle animation */}
          <div className="absolute inset-0 -m-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 animate-ping" />
          </div>
          <div className="absolute inset-0 -m-1">
            <div className="w-8 h-8 rounded-full bg-primary/30" />
          </div>

          {/* Main marker */}
          <div className="relative bg-primary text-primary-foreground rounded-full p-2 shadow-float">
            <div className="w-4 h-4 rounded-full bg-current" />
          </div>
        </div>
      </div>

      {/* Destination marker */}
      <div
        className="absolute z-10"
        style={{
          left: `${endX}%`,
          top: `${endY}%`,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="relative">
          <MapPin className="w-8 h-8 text-danger drop-shadow-lg fill-current" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-danger/30 rounded-full blur-sm" />
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
        <div className="text-xs text-muted-foreground">Journey Progress</div>
        <div className="text-sm font-semibold">{progress}%</div>
      </div>
    </div>
  );
};

export default MapView;
