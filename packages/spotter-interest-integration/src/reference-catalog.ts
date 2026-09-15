import { readFileSync } from "node:fs";
import type {
  AircraftNotabilityTag,
  AircraftNotabilityFacts,
  GlobalTypeRarityFacts,
  LocalTypeRarityFacts,
  RegistrationRarityFacts,
} from "../../domain/src/index.ts";

export interface ReferenceSource {
  id: string;
  name: string;
  url: string | null;
  asOfDate: string | null;
  retrievedAt: string | null;
  notes: string;
}

export interface AircraftTypeReference {
  typeId: string;
  icaoAliases: string[];
  activeGlobalFleetSize?: number;
  sourceIds: string[];
}

export interface AirportTypeStatistic extends LocalTypeRarityFacts {
  typeId: string;
  sourceIds: string[];
}

export interface RegistrationHistoryReference
extends RegistrationRarityFacts {
  registration: string;
  sourceIds: string[];
}

export interface AircraftNotabilityReference
extends AircraftNotabilityFacts {
  registration: string;
  description: string;
  sourceIds: string[];
}

export interface SpotterReferenceCatalogData {
  schemaVersion: "1";
  datasetVersion: string;
  sources: ReferenceSource[];
  aircraftTypes: AircraftTypeReference[];
  airportTypeStatistics: AirportTypeStatistic[];
  registrationHistory: RegistrationHistoryReference[];
  aircraftNotability: AircraftNotabilityReference[];
}

const NOTABILITY_TAGS = new Set<AircraftNotabilityTag>([
  "SPECIAL_LIVERY",
  "RETRO_LIVERY",
  "ANNIVERSARY_LIVERY",
  "COMMEMORATIVE_LIVERY",
  "PROMOTIONAL_LIVERY",
  "ALLIANCE_LIVERY",
  "ONE_OFF_LIVERY",
  "FIRST_OF_TYPE_FOR_AIRLINE",
  "LAST_OF_TYPE_FOR_AIRLINE",
  "FIRST_DELIVERED_TO_AIRLINE",
  "LAST_DELIVERED_TO_AIRLINE",
  "FIRST_PRODUCTION_AIRFRAME",
  "LAST_PRODUCTION_AIRFRAME",
  "PROTOTYPE",
  "TEST_AIRCRAFT",
  "HISTORICALLY_SIGNIFICANT_AIRFRAME",
  "OTHER_NOTABLE_HISTORY",
]);

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid spotter reference catalog: ${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid spotter reference catalog: ${path} must be an array.`);
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid spotter reference catalog: ${path} must be a non-empty string.`);
  }
  return value.trim();
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return string(value, path);
}

function integer(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`Invalid spotter reference catalog: ${path} must be a non-negative integer.`);
  }
  return value as number;
}

function strings(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => string(item, `${path}[${index}]`));
}

function uniqueKey(seen: Set<string>, key: string, path: string): void {
  if (seen.has(key)) {
    throw new Error(`Invalid spotter reference catalog: duplicate ${path} '${key}'.`);
  }
  seen.add(key);
}

function validateSourceIds(
  sourceIds: string[],
  knownSources: Set<string>,
  path: string,
): void {
  if (sourceIds.length === 0) {
    throw new Error(`Invalid spotter reference catalog: ${path} must not be empty.`);
  }
  for (const sourceId of sourceIds) {
    if (!knownSources.has(sourceId)) {
      throw new Error(
        `Invalid spotter reference catalog: ${path} references unknown source '${sourceId}'.`,
      );
    }
  }
}

function parseCuratedScores(
  value: unknown,
  path: string,
): AircraftNotabilityFacts["curatedScores"] {
  if (value === undefined) return undefined;
  const scores = record(value, path);
  const allowed = new Set([
    "HISTORICALLY_SIGNIFICANT_AIRFRAME",
    "OTHER_NOTABLE_HISTORY",
  ]);
  const parsed: NonNullable<AircraftNotabilityFacts["curatedScores"]> = {};
  for (const [key, score] of Object.entries(scores)) {
    if (!allowed.has(key)) {
      throw new Error(`Invalid spotter reference catalog: ${path} contains '${key}'.`);
    }
    if (typeof score !== "number" || !Number.isFinite(score)) {
      throw new Error(`Invalid spotter reference catalog: ${path}.${key} must be numeric.`);
    }
    parsed[key as keyof typeof parsed] = score;
  }
  return parsed;
}

export function parseReferenceCatalog(value: unknown): SpotterReferenceCatalogData {
  const root = record(value, "root");
  if (root.schemaVersion !== "1") {
    throw new Error("Invalid spotter reference catalog: schemaVersion must be '1'.");
  }
  const datasetVersion = string(root.datasetVersion, "datasetVersion");

  const sourceIds = new Set<string>();
  const sources = array(root.sources, "sources").map((item, index) => {
    const path = `sources[${index}]`;
    const source = record(item, path);
    const id = string(source.id, `${path}.id`);
    uniqueKey(sourceIds, id, "source id");
    return {
      id,
      name: string(source.name, `${path}.name`),
      url: nullableString(source.url, `${path}.url`),
      asOfDate: nullableString(source.asOfDate, `${path}.asOfDate`),
      retrievedAt: nullableString(source.retrievedAt, `${path}.retrievedAt`),
      notes: string(source.notes, `${path}.notes`),
    };
  });
  if (sources.length === 0) {
    throw new Error("Invalid spotter reference catalog: sources must not be empty.");
  }

  const typeIds = new Set<string>();
  const aliases = new Set<string>();
  const aircraftTypes = array(root.aircraftTypes, "aircraftTypes")
    .map((item, index) => {
      const path = `aircraftTypes[${index}]`;
      const type = record(item, path);
      const typeId = string(type.typeId, `${path}.typeId`);
      uniqueKey(typeIds, typeId.toUpperCase(), "aircraft type id");
      const icaoAliases = strings(type.icaoAliases, `${path}.icaoAliases`)
        .map((alias) => alias.toUpperCase());
      for (const alias of icaoAliases) {
        uniqueKey(aliases, alias, "aircraft type alias");
      }
      const itemSourceIds = strings(type.sourceIds, `${path}.sourceIds`);
      validateSourceIds(itemSourceIds, sourceIds, `${path}.sourceIds`);
      return {
        typeId,
        icaoAliases,
        ...(type.activeGlobalFleetSize === undefined
          ? {}
          : {
              activeGlobalFleetSize: integer(
                type.activeGlobalFleetSize,
                `${path}.activeGlobalFleetSize`,
              ),
            }),
        sourceIds: itemSourceIds,
      };
    });

  const localKeys = new Set<string>();
  const airportTypeStatistics = array(
    root.airportTypeStatistics,
    "airportTypeStatistics",
  ).map((item, index) => {
    const path = `airportTypeStatistics[${index}]`;
    const statistic = record(item, path);
    const airportCode = string(statistic.airportCode, `${path}.airportCode`)
      .toUpperCase();
    const typeId = string(statistic.typeId, `${path}.typeId`);
    if (!typeIds.has(typeId.toUpperCase())) {
      throw new Error(`Invalid spotter reference catalog: ${path}.typeId is unknown.`);
    }
    uniqueKey(localKeys, `${airportCode}:${typeId.toUpperCase()}`, "airport/type key");
    const dataQuality = statistic.dataQuality;
    if (dataQuality !== "SUFFICIENT" && dataQuality !== "INSUFFICIENT") {
      throw new Error(
        `Invalid spotter reference catalog: ${path}.dataQuality must be SUFFICIENT or INSUFFICIENT.`,
      );
    }
    const validatedDataQuality: "SUFFICIENT" | "INSUFFICIENT" = dataQuality;
    const itemSourceIds = strings(statistic.sourceIds, `${path}.sourceIds`);
    validateSourceIds(itemSourceIds, sourceIds, `${path}.sourceIds`);
    return {
      airportCode,
      typeId,
      variant: typeId,
      historicalWindowDays: integer(
        statistic.historicalWindowDays,
        `${path}.historicalWindowDays`,
      ),
      typeMovements: integer(statistic.typeMovements, `${path}.typeMovements`),
      totalMovements: integer(statistic.totalMovements, `${path}.totalMovements`),
      dataQuality: validatedDataQuality,
      sourceIds: itemSourceIds,
    };
  });

  const registrationKeys = new Set<string>();
  const registrationHistory = array(root.registrationHistory, "registrationHistory")
    .map((item, index) => {
      const path = `registrationHistory[${index}]`;
      const history = record(item, path);
      const airportCode = string(history.airportCode, `${path}.airportCode`)
        .toUpperCase();
      const registration = string(history.registration, `${path}.registration`)
        .toUpperCase();
      uniqueKey(registrationKeys, `${airportCode}:${registration}`, "airport/registration key");
      const daysSinceLastVisit = history.daysSinceLastVisit === null
        ? null
        : integer(history.daysSinceLastVisit, `${path}.daysSinceLastVisit`);
      const itemSourceIds = strings(history.sourceIds, `${path}.sourceIds`);
      validateSourceIds(itemSourceIds, sourceIds, `${path}.sourceIds`);
      return {
        airportCode,
        registration,
        historicalWindowDays: integer(
          history.historicalWindowDays,
          `${path}.historicalWindowDays`,
        ),
        visits: integer(history.visits, `${path}.visits`),
        daysSinceLastVisit,
        sourceIds: itemSourceIds,
      };
    });

  const notabilityKeys = new Set<string>();
  const aircraftNotability = array(root.aircraftNotability, "aircraftNotability")
    .map((item, index) => {
      const path = `aircraftNotability[${index}]`;
      const notability = record(item, path);
      const registration = string(notability.registration, `${path}.registration`)
        .toUpperCase();
      uniqueKey(notabilityKeys, registration, "notability registration");
      const tags = strings(notability.tags, `${path}.tags`);
      for (const tag of tags) {
        if (!NOTABILITY_TAGS.has(tag as AircraftNotabilityTag)) {
          throw new Error(`Invalid spotter reference catalog: ${path}.tags contains '${tag}'.`);
        }
      }
      const itemSourceIds = strings(notability.sourceIds, `${path}.sourceIds`);
      validateSourceIds(itemSourceIds, sourceIds, `${path}.sourceIds`);
      const curatedScores = parseCuratedScores(
        notability.curatedScores,
        `${path}.curatedScores`,
      );
      return {
        registration,
        tags: tags as AircraftNotabilityTag[],
        ...(curatedScores ? { curatedScores } : {}),
        description: string(notability.description, `${path}.description`),
        sourceIds: itemSourceIds,
      };
    });

  return {
    schemaVersion: "1",
    datasetVersion,
    sources,
    aircraftTypes,
    airportTypeStatistics,
    registrationHistory,
    aircraftNotability,
  };
}

export class SpotterReferenceCatalog {
  readonly data: SpotterReferenceCatalogData;
  private readonly aircraftTypeById = new Map<string, AircraftTypeReference>();
  private readonly aircraftTypeByAlias = new Map<string, AircraftTypeReference>();
  private readonly airportTypeByKey = new Map<string, AirportTypeStatistic>();
  private readonly registrationHistoryByKey = new Map<
    string,
    RegistrationHistoryReference
  >();
  private readonly notabilityByRegistration = new Map<
    string,
    AircraftNotabilityReference
  >();

  constructor(value: unknown) {
    this.data = parseReferenceCatalog(value);
    for (const type of this.data.aircraftTypes) {
      this.aircraftTypeById.set(type.typeId.toUpperCase(), type);
      for (const alias of type.icaoAliases) {
        this.aircraftTypeByAlias.set(alias, type);
      }
    }
    for (const statistic of this.data.airportTypeStatistics) {
      this.airportTypeByKey.set(
        `${statistic.airportCode}:${statistic.typeId.toUpperCase()}`,
        statistic,
      );
    }
    for (const history of this.data.registrationHistory) {
      this.registrationHistoryByKey.set(
        `${history.airportCode}:${history.registration}`,
        history,
      );
    }
    for (const notability of this.data.aircraftNotability) {
      this.notabilityByRegistration.set(notability.registration, notability);
    }
  }

  findAircraftType(value: string): AircraftTypeReference | undefined {
    const key = value.trim().toUpperCase();
    return this.aircraftTypeByAlias.get(key) ?? this.aircraftTypeById.get(key);
  }

  findGlobalType(typeId: string): GlobalTypeRarityFacts | undefined {
    const type = this.aircraftTypeById.get(typeId.trim().toUpperCase());
    return type?.activeGlobalFleetSize === undefined
      ? undefined
      : { variant: type.typeId, activeGlobalFleetSize: type.activeGlobalFleetSize };
  }

  findAirportType(
    airportCode: string,
    typeId: string,
  ): AirportTypeStatistic | undefined {
    return this.airportTypeByKey.get(
      `${normalizeReferenceAirportCode(airportCode)}:${typeId.trim().toUpperCase()}`,
    );
  }

  findRegistrationHistory(
    airportCode: string,
    registration: string,
  ): RegistrationHistoryReference | undefined {
    return this.registrationHistoryByKey.get(
      `${normalizeReferenceAirportCode(airportCode)}:${registration.trim().toUpperCase()}`,
    );
  }

  findNotability(registration: string): AircraftNotabilityReference | undefined {
    return this.notabilityByRegistration.get(registration.trim().toUpperCase());
  }
}

export function normalizeReferenceAirportCode(airportCode: string): string {
  const normalized = airportCode.trim().toUpperCase();
  return normalized === "KATL" ? "ATL" : normalized;
}

export function loadReferenceCatalog(
  url = new URL("../reference/spotter-reference-v0.1.json", import.meta.url),
): SpotterReferenceCatalog {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(url, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not load spotter reference catalog: ${message}`);
  }
  return new SpotterReferenceCatalog(value);
}

export const spotterReferenceCatalog = loadReferenceCatalog();
