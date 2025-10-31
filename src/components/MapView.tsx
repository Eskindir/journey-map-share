import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = "AIzaSyDABp7Bg9ODZSE3oFcJ5LpdBz2wLqP7PRg";

const MapView = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
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
    // Add a small delay to ensure map is fully ready
    setTimeout(() => setIsMapReady(true), 500);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setIsMapReady(false);
  }, []);

  // Animate the route
  useEffect(() => {
    if (!map || !isMapReady || currentStep >= journeyCoordinates.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      
      // Pan map to follow current position
      if (journeyCoordinates[currentStep + 1]) {
        map.panTo(journeyCoordinates[currentStep + 1]);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [map, isMapReady, currentStep, journeyCoordinates]);

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
        {/* Only render map elements after map is ready */}
        {isMapReady && (
          <>
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
          </>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapView;
