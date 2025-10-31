import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MapView = () => {
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: tokenSaved ? googleMapsApiKey : "",
  });

  // Journey coordinates (simulating a route)
  const startPoint = { lat: 37.7749, lng: -122.4194 }; // San Francisco
  const endPoint = { lat: 37.7849, lng: -122.4094 };
  
  // Create intermediate points for the journey
  const totalSteps = 20;
  const journeyCoordinates: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const progress = i / totalSteps;
    journeyCoordinates.push({
      lat: startPoint.lat + (endPoint.lat - startPoint.lat) * progress,
      lng: startPoint.lng + (endPoint.lng - startPoint.lng) * progress
    });
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Animate the route
  useEffect(() => {
    if (!map || currentStep >= journeyCoordinates.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      
      // Pan map to follow current position
      if (journeyCoordinates[currentStep + 1]) {
        map.panTo(journeyCoordinates[currentStep + 1]);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [map, currentStep, journeyCoordinates]);

  if (!tokenSaved) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-6">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-maps-key">Google Maps API Key</Label>
            <Input
              id="google-maps-key"
              type="text"
              placeholder="AIza..."
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://console.cloud.google.com/google/maps-apis"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Google Cloud Console
            </a>
          </p>
          <button
            onClick={() => setTokenSaved(true)}
            disabled={!googleMapsApiKey}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  const currentPosition = journeyCoordinates[currentStep];
  const pathSoFar = journeyCoordinates.slice(0, currentStep + 1);

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={startPoint}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Animated route line */}
        {pathSoFar.length > 1 && (
          <Polyline
            path={pathSoFar}
            options={{
              strokeColor: "#1A73E8",
              strokeOpacity: 0.8,
              strokeWeight: 4,
            }}
          />
        )}

        {/* Start marker */}
        <Marker
          position={startPoint}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#34A853",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          }}
        />

        {/* Current position marker */}
        <Marker
          position={currentPosition}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#1A73E8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          }}
        />

        {/* Destination marker */}
        <Marker
          position={endPoint}
          label="📍"
        />
      </GoogleMap>
    </div>
  );
};

export default MapView;
