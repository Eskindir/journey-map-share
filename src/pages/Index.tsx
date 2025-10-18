import MapView from "@/components/MapView";
import DriverPanel from "@/components/DriverPanel";

const Index = () => {
  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-gradient-subtle">
      {/* Map Section */}
      <div className="flex-1 relative">
        <MapView />
      </div>

      {/* Driver Panel Section */}
      <div className="w-full md:w-[420px] p-4 md:p-6 overflow-y-auto">
        <DriverPanel />
      </div>
    </div>
  );
};

export default Index;
