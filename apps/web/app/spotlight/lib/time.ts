const ATLANTA_TIME_ZONE = "America/New_York";

export function formatAtlantaDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: ATLANTA_TIME_ZONE,
  }).format(new Date(timestamp));
}

export function formatAtlantaTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ATLANTA_TIME_ZONE,
  }).format(new Date(timestamp));
}

export function formatAtlantaTimeWithZone(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ATLANTA_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date(timestamp));
}

export function formatAtlantaWindow(start: string, end: string): string {
  const startTime = formatAtlantaTime(start);
  const endParts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ATLANTA_TIME_ZONE,
    timeZoneName: "short",
  }).formatToParts(new Date(end));
  const endTime = endParts
    .filter((part) => part.type === "hour" || part.type === "minute" || part.type === "literal")
    .map((part) => part.value)
    .join("")
    .replace(/\s+$/, "");
  const zone = endParts.find((part) => part.type === "timeZoneName")?.value
    ?? "ATL local";
  return `${startTime}–${endTime} ${zone}`;
}
