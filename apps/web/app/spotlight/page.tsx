import { loadSpotlightPageData } from "@/lib/server/spotlight-loader";
import { SpotlightDashboard } from "./components/spotlight-dashboard";

export const dynamic = "force-dynamic";

export default async function SpotlightPage() {
  const data = await loadSpotlightPageData();
  return <SpotlightDashboard {...data} />;
}
