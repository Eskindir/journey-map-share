import { useEffect, useState, useRef, useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { config } from "@/lib/config";
import { TAXI_MARKER_ICON } from "@/assets/taxi-marker";

const GOOGLE_MAP_LIBRARIES: ("geometry")[] = ["geometry"];

interface MapViewProps {
  initialPosition?: { latitude: number; longitude: number };
  destinationPosition?: { latitude: number; longitude: number };
  locationHistory?: Array<{ latitude: number; longitude: number }>;
  showGoogleMap?: boolean;
  /** Driver marker on the Google map (default: car/taxi icon). */
  driverMarker?: "car" | "default";
}

function computeHeading(
  history: Array<{ latitude: number; longitude: number }>,
): number | undefined {
  if (
    history.length < 2 ||
    typeof google === "undefined" ||
    !google.maps?.geometry?.spherical
  ) {
    return undefined;
  }

  const prev = history[history.length - 2];
  const curr = history[history.length - 1];

  return google.maps.geometry.spherical.computeHeading(
    new google.maps.LatLng(prev.latitude, prev.longitude),
    new google.maps.LatLng(curr.latitude, curr.longitude),
  );
}

const MapView = ({
  initialPosition,
  destinationPosition,
  locationHistory = [],
  showGoogleMap = false,
  driverMarker = "car",
}: MapViewProps) => {
  const [progress, setProgress] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    if (showGoogleMap) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 5;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [showGoogleMap]);

  const driverHeading = useMemo(
    () => computeHeading(locationHistory),
    [locationHistory, mapLoaded],
  );

  const driverPosition =
    locationHistory.length > 0
      ? locationHistory[locationHistory.length - 1]
      : initialPosition;

  useEffect(() => {
    if (!showGoogleMap || !driverPosition || !mapRef.current || !mapLoaded) {
      return;
    }

    const latLng = {
      lat: driverPosition.latitude,
      lng: driverPosition.longitude,
    };

    if (hasFitBoundsRef.current) {
      mapRef.current.panTo(latLng);
    }
  }, [
    driverPosition?.latitude,
    driverPosition?.longitude,
    showGoogleMap,
    mapLoaded,
  ]);

  const mapContainerStyle = {
    width: "100%",
    height: "100%",
  };

  const defaultCenter = {
    lat: driverPosition?.latitude || initialPosition?.latitude || 9.032,
    lng: driverPosition?.longitude || initialPosition?.longitude || 38.7469,
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    mapId: "DEMO_MAP_ID",
  };

  if (showGoogleMap && driverPosition) {
    const routePath =
      locationHistory.length > 1
        ? locationHistory.map((pos) => ({
            lat: pos.latitude,
            lng: pos.longitude,
          }))
        : [];

    const polylineOptions = {
      strokeColor: "#3b82f6",
      strokeOpacity: 0,
      strokeWeight: 2,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 0.7,
            strokeWeight: 2,
            scale: 3,
          },
          offset: "0",
          repeat: "12px",
        },
      ],
      geodesic: true,
    };

    const driverIcon: google.maps.Icon | undefined =
      mapLoaded && driverMarker === "car"
        ? {
            url: TAXI_MARKER_ICON,
            scaledSize: new google.maps.Size(40, 48),
            anchor: new google.maps.Point(20, 46),
            ...(driverHeading !== undefined ? { rotation: driverHeading } : {}),
          }
        : undefined;

    return (
      <div className="relative w-full h-full">
        <LoadScript
          googleMapsApiKey={config.googleMaps.apiKey}
          libraries={GOOGLE_MAP_LIBRARIES}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={15}
            options={mapOptions}
            onLoad={(map) => {
              mapRef.current = map;
              setMapLoaded(true);

              if (driverPosition && destinationPosition) {
                const bounds = new google.maps.LatLngBounds();
                bounds.extend({
                  lat: driverPosition.latitude,
                  lng: driverPosition.longitude,
                });
                bounds.extend({
                  lat: destinationPosition.latitude,
                  lng: destinationPosition.longitude,
                });
                map.fitBounds(bounds);
                hasFitBoundsRef.current = true;
              } else if (driverPosition) {
                map.setCenter({
                  lat: driverPosition.latitude,
                  lng: driverPosition.longitude,
                });
                hasFitBoundsRef.current = true;
              }
            }}
          >
            {routePath.length > 1 && (
              <Polyline path={routePath} options={polylineOptions} />
            )}

            {mapLoaded && (
              <>
                <Marker
                  position={{
                    lat: driverPosition.latitude,
                    lng: driverPosition.longitude,
                  }}
                  {...(driverIcon ? { icon: driverIcon } : {})}
                  title="Driver Location"
                  zIndex={2}
                />

                {destinationPosition && (
                  <Marker
                    position={{
                      lat: destinationPosition.latitude,
                      lng: destinationPosition.longitude,
                    }}
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                      scaledSize: new google.maps.Size(36, 36),
                    }}
                    title="Destination"
                    zIndex={1}
                  />
                )}
              </>
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    );
  }

  const startX = 20;
  const startY = 70;
  const endX = 80;
  const endY = 30;

  const currentX = startX + (endX - startX) * (progress / 100);
  const currentY = startY + (endY - startY) * (progress / 100);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-muted/30 via-muted/10 to-background overflow-hidden">
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

      <div
        className="absolute z-10 transition-all duration-1000"
        style={{
          left: `${currentX}%`,
          top: `${currentY}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 -m-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 animate-ping" />
          </div>
          <div className="absolute inset-0 -m-1">
            <div className="w-8 h-8 rounded-full bg-primary/30" />
          </div>
          <div className="relative bg-primary text-primary-foreground rounded-full p-2 shadow-float">
            <div className="w-4 h-4 rounded-full bg-current" />
          </div>
        </div>
      </div>

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

      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border">
        <div className="text-xs text-muted-foreground">Journey Progress</div>
        <div className="text-sm font-semibold">{progress}%</div>
      </div>
    </div>
  );
};

export default MapView;
