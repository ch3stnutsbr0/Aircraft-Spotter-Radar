import type { AircraftMovement } from "../../domain/src/index.ts";

export interface AirportMovementQuery {
  start: Date;
  end: Date;
  maxPages?: number;
}

export interface AviationDataProvider {
  getAirportMovements(
    airport: string,
    options: AirportMovementQuery,
  ): Promise<AircraftMovement[]>;
}
