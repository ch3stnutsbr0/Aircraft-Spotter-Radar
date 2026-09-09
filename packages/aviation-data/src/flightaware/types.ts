export interface FlightAwareAirportRef {
  code?: string | null;
  code_icao?: string | null;
  code_iata?: string | null;
  code_lid?: string | null;
}

export interface FlightAwareFlight {
  ident?: string | null;
  ident_icao?: string | null;
  fa_flight_id?: string | null;
  operator?: string | null;
  operator_icao?: string | null;
  registration?: string | null;
  aircraft_type?: string | null;
  origin?: FlightAwareAirportRef | null;
  destination?: FlightAwareAirportRef | null;
  cancelled?: boolean | null;
  diverted?: boolean | null;
  status?: string | null;
  scheduled_out?: string | null;
  estimated_out?: string | null;
  actual_out?: string | null;
  scheduled_off?: string | null;
  estimated_off?: string | null;
  actual_off?: string | null;
  scheduled_on?: string | null;
  estimated_on?: string | null;
  actual_on?: string | null;
  scheduled_in?: string | null;
  estimated_in?: string | null;
  actual_in?: string | null;
  last_updated?: string | null;
}

export interface FlightAwareLinks {
  next?: string | null;
}

export interface FlightAwareCollectionResponse {
  links?: FlightAwareLinks | null;
  num_pages?: number;
  scheduled_arrivals?: FlightAwareFlight[];
  scheduled_departures?: FlightAwareFlight[];
}

export type FlightAwareMovementKind =
  | "scheduled_arrivals"
  | "scheduled_departures";

export interface FlightAwareCollectionResult {
  records: FlightAwareFlight[];
  pages: number;
  httpRequests: number;
  truncated: boolean;
  rawSamples: FlightAwareFlight[];
}
