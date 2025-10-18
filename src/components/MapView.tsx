import { MapPin, Navigation } from "lucide-react";

const MapView = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-muted/30 via-muted/10 to-background overflow-hidden">
      {/* Map grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Simulated map streets */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="0" y1="60%" x2="100%" y2="60%" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="20%" y1="0" x2="20%" y2="100%" stroke="hsl(var(--border))" strokeWidth="2" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(var(--border))" strokeWidth="3" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="hsl(var(--border))" strokeWidth="2" />
      </svg>

      {/* User location marker - centered */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          {/* Pulsing circle animation */}
          <div className="absolute inset-0 -m-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 animate-ping" />
          </div>
          <div className="absolute inset-0 -m-2">
            <div className="w-12 h-12 rounded-full bg-primary/30" />
          </div>
          
          {/* Main marker */}
          <div className="relative bg-primary text-primary-foreground rounded-full p-3 shadow-float">
            <Navigation className="w-6 h-6 fill-current" />
          </div>
        </div>
      </div>

      {/* Destination marker (example) */}
      <div className="absolute top-[25%] right-[20%] z-10">
        <div className="relative">
          <MapPin className="w-10 h-10 text-accent drop-shadow-lg fill-current" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-accent/30 rounded-full blur-sm" />
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
        <button className="bg-card text-card-foreground p-3 rounded-lg shadow-elevated hover:shadow-float transition-all hover:scale-105">
          <span className="text-xl font-bold">+</span>
        </button>
        <button className="bg-card text-card-foreground p-3 rounded-lg shadow-elevated hover:shadow-float transition-all hover:scale-105">
          <span className="text-xl font-bold">−</span>
        </button>
      </div>
    </div>
  );
};

export default MapView;
