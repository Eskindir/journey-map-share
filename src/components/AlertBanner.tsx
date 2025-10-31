import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  message: string;
  variant: "success" | "warning" | "danger" | "info";
  onClose?: () => void;
}

const AlertBanner = ({ message, variant, onClose }: AlertBannerProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-success text-success-foreground";
      case "warning":
        return "bg-warning text-warning-foreground";
      case "danger":
        return "bg-danger text-danger-foreground";
      case "info":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted";
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle2 className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "danger":
        return <XCircle className="h-5 w-5" />;
      case "info":
        return <Clock className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        "px-4 py-3 flex items-center gap-3 animate-fade-in shadow-md",
        getVariantStyles()
      )}
    >
      {getIcon()}
      <span className="flex-1 text-sm font-medium">{message}</span>
      {onClose && (
        <button onClick={onClose} className="hover:opacity-80">
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
