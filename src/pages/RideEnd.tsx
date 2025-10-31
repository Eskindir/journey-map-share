import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Star } from "lucide-react";
import MapView from "@/components/MapView";

const RideEnd = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <h1 className="text-xl font-semibold text-center">Ride Completed</h1>
      </header>

      {/* Map Area */}
      <div className="h-80 relative">
        <MapView />
      </div>

      {/* Completion Card */}
      <div className="flex-1 p-6">
        <Card className="border-success/20">
          <CardContent className="p-6 text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>

            {/* Completion Message */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Arrived Safely!</h2>
              <p className="text-muted-foreground">
                Your ride ended at <span className="font-medium">15:32</span>
              </p>
            </div>

            {/* Rating Section */}
            <div className="py-4 space-y-3">
              <p className="text-sm font-medium">How was your ride?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    className="p-2 hover:scale-110 transition-transform"
                  >
                    <Star className="h-8 w-8 text-muted-foreground hover:text-warning hover:fill-warning transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button 
                variant="outline" 
                className="w-full"
              >
                Report an Issue
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RideEnd;
