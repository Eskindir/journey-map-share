import { Star, Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import driverPhoto from "@/assets/driver-photo.jpg";

const DriverPanel = () => {
  return (
    <div className="bg-card rounded-2xl shadow-float p-6 space-y-6 animate-in slide-in-from-right duration-500">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
          Driver arriving
        </Badge>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-semibold">3 min</span>
        </div>
      </div>

      {/* Driver Info */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 ring-2 ring-primary/20">
          <AvatarImage src={driverPhoto} alt="Driver" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">James Wilson</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">4.95</span>
            </div>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">2,847 rides</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="rounded-full">
            <Phone className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" className="rounded-full">
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Car Details */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Vehicle</span>
          <span className="text-sm font-medium">Toyota Camry</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Color</span>
          <span className="text-sm font-medium">Silver</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">License Plate</span>
          <span className="text-sm font-semibold tracking-wider">ABC 1234</span>
        </div>
      </div>

      {/* Trip Details */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Trip Details</h4>
        
        <div className="space-y-4 relative pl-6">
          {/* Route line */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-accent" />
          
          {/* Pickup */}
          <div className="relative">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-primary border-4 border-card shadow-sm" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pickup</div>
              <div className="text-sm font-medium">123 Main Street, Downtown</div>
              <div className="text-xs text-muted-foreground mt-0.5">Now</div>
            </div>
          </div>

          {/* Destination */}
          <div className="relative">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-accent border-4 border-card shadow-sm" />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Destination</div>
              <div className="text-sm font-medium">456 Oak Avenue, Northside</div>
              <div className="text-xs text-muted-foreground mt-0.5">15 min • 4.2 miles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Estimated fare</span>
          <span className="text-2xl font-bold text-foreground">$24.50</span>
        </div>
      </div>

      {/* Action Button */}
      <Button className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-elevated hover:shadow-float transition-all hover:scale-[1.02]">
        <MapPin className="w-4 h-4 mr-2" />
        Track Driver
      </Button>
    </div>
  );
};

export default DriverPanel;
