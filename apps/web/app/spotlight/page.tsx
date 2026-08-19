import { mockMovements } from "@/lib/mock-movements";
import { mockAtlAirportStatus } from "@/lib/mock-airport-status";
import { SpotlightDashboard } from "./components/spotlight-dashboard";

export default function SpotlightPage() {
  return (
    <SpotlightDashboard
      movements={mockMovements}
      airportStatus={mockAtlAirportStatus}
    />
  );
}
