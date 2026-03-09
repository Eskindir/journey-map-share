import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const TrackRedirect = () => {
  const { trackingId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (trackingId) {
      navigate(`/track?trackingId=${trackingId}&sendingTrackingInfo=false`, {
        replace: true,
      });
    }
  }, [trackingId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading ride tracker...</p>
      </div>
    </div>
  );
};

export default TrackRedirect;
