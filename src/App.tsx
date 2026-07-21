import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import RideStart from "./pages/RideStart";
import TrackRide from "./pages/TrackRide";
import RideEnd from "./pages/RideEnd";
import NotificationsTest from "./pages/NotificationsTest";
import NotFound from "./pages/NotFound";
import SOSEmergency from "./pages/SOSEmergency";
import TrackRedirect from "./pages/TrackRedirect";
import StartRedirect from "./pages/StartRedirect";
import InstallPWA from "./components/InstallPWA";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPWA />
        <ThemeToggle />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RideStart />} />
            <Route path="/track" element={<TrackRide />} />
            <Route path="/ride-end" element={<RideEnd />} />
            <Route path="/notifications" element={<NotificationsTest />} />
            <Route path="/t/:trackingId" element={<TrackRedirect />} />
            <Route path="/sos/:sosId" element={<SOSEmergency />} />
            <Route path="/start/:trackingId" element={<StartRedirect />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
