import type { ServiceType } from "./store";

/**
 * Mission compensation config. Tune fees and tier mapping here: the rest of
 * the app derives everything from this file.
 */

export const MISSION_TIERS = ["short", "medium", "long"] as const;
export type MissionTier = (typeof MISSION_TIERS)[number];

/** Fixed fee (EUR) a collaborator earns per completed mission, by tier. */
export const TIER_FEES: Record<MissionTier, number> = {
  short: 10,
  medium: 15,
  long: 25,
};

/**
 * The mission tier is the service type, mapped — not a separate field to fill:
 * a medication or errand run is short, groceries take a morning, an
 * accompaniment (visits, hospital) takes the day's better part.
 */
export const TIER_BY_SERVICE: Record<ServiceType, MissionTier> = {
  medications: "short",
  errand: "short",
  groceries: "medium",
  accompaniment: "long",
};

export function missionTier(service: ServiceType): MissionTier {
  return TIER_BY_SERVICE[service];
}

/** The fee (EUR) a mission of this service type pays once completed. */
export function missionFee(service: ServiceType): number {
  return TIER_FEES[missionTier(service)];
}
