import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !tokenSaved || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Journey coordinates (simulating a route)
    const startPoint: [number, number] = [-122.4194, 37.7749]; // San Francisco
    const endPoint: [number, number] = [-122.4094, 37.7849];
    
    // Create intermediate points for the journey
    const totalSteps = 20;
    const journeyCoordinates: [number, number][] = [];
    for (let i = 0; i <= totalSteps; i++) {
      const progress = i / totalSteps;
      journeyCoordinates.push([
        startPoint[0] + (endPoint[0] - startPoint[0]) * progress,
        startPoint[1] + (endPoint[1] - startPoint[1]) * progress
      ]);
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: startPoint,
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    let currentStep = 0;

    map.current.on("load", () => {
      if (!map.current) return;

      // Add the route source
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [journeyCoordinates[0]]
          }
        }
      });

      // Add the route layer
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#1A73E8",
          "line-width": 4,
          "line-opacity": 0.8
        }
      });

      // Add start marker
      new mapboxgl.Marker({ color: "#34A853" })
        .setLngLat(startPoint)
        .addTo(map.current);

      // Add current position marker
      const currentMarker = new mapboxgl.Marker({ color: "#1A73E8" })
        .setLngLat(startPoint)
        .addTo(map.current);

      // Animate the route line
      const animateRoute = () => {
        if (!map.current || currentStep >= journeyCoordinates.length) return;

        currentStep++;
        const currentCoordinates = journeyCoordinates.slice(0, currentStep + 1);

        const source = map.current.getSource("route") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: currentCoordinates
            }
          });
        }

        // Update current position marker
        currentMarker.setLngLat(journeyCoordinates[currentStep]);

        // Pan map to follow current position
        map.current.panTo(journeyCoordinates[currentStep]);

        if (currentStep < journeyCoordinates.length - 1) {
          setTimeout(animateRoute, 2000); // Update every 2 seconds
        }
      };

      // Start animation after 1 second
      setTimeout(animateRoute, 1000);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, tokenSaved]);

  if (!tokenSaved) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-6">
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Get your token from{" "}
            <a
              href="https://mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
          </p>
          <button
            onClick={() => setTokenSaved(true)}
            disabled={!mapboxToken}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default MapView;
