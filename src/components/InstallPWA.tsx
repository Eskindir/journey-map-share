import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 shadow-lg border-primary">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install App</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Install this app for quick access and offline support
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button onClick={handleDismiss} variant="outline" size="sm">
                Not Now
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallPWA;
