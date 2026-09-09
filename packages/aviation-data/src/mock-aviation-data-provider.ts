import type { AircraftMovement } from "../../domain/src/index.ts";
import type {
  AirportMovementQuery,
  AviationDataProvider,
} from "./aviation-data-provider.ts";

function fallsInWindow(
  movement: AircraftMovement,
  start: Date,
  end: Date,
): boolean {
  const movementTime = movement.movementType === "ARRIVAL"
    ? movement.estimatedArrivalTime ?? movement.scheduledArrivalTime
    : movement.scheduledDepartureTime ?? movement.estimatedDepartureTime;

  return movementTime !== null
    && movementTime >= start
    && movementTime < end;
}

export class MockAviationDataProvider implements AviationDataProvider {
  private readonly movements: readonly AircraftMovement[];

  constructor(movements: readonly AircraftMovement[]) {
    this.movements = movements;
  }

  async getAirportMovements(
    airport: string,
    options: AirportMovementQuery,
  ): Promise<AircraftMovement[]> {
    const normalizedAirport = airport.trim().toUpperCase();

    return this.movements.filter((movement) => {
      const matchesAirport = movement.movementType === "ARRIVAL"
        ? movement.destinationAirport === normalizedAirport
        : movement.originAirport === normalizedAirport;

      return matchesAirport
        && fallsInWindow(movement, options.start, options.end);
    });
  }
}
