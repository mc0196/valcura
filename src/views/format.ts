import type { Plan, ReportFrequency, RequestChannel, RequestStatus, ServiceType } from "../store/store";
import { CARE_RECIPIENTS } from "../store/seed";

// UI copy stays in Italian: the demo is pitched to the founding partners.
export const SERVICE_LABELS: Record<ServiceType, string> = {
  groceries: "Spesa",
  medications: "Farmaci",
  accompaniment: "Accompagnamento",
  errand: "Commissione",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "nuova",
  assigned: "assegnata",
  completed: "completata",
};

export const CHANNEL_LABELS: Record<RequestChannel, string> = {
  phone: "da telefonata",
  family: "dalla famiglia",
};

export const REPORT_FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  monthly: "mensile",
  weekly: "settimanale",
};

/** The report side of a plan's offer, e.g. "settimanale + telefonata" for Family Care. */
export function formatPlanReport(plan: Plan): string {
  const frequency = REPORT_FREQUENCY_LABELS[plan.reportFrequency];
  return plan.includesCall ? `${frequency} + telefonata` : frequency;
}

export { localToday } from "../store/store";

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function recipientName(recipientId: string): string {
  return CARE_RECIPIENTS.find((r) => r.id === recipientId)?.name ?? "Assistito sconosciuto";
}

/** Ranking with one decimal ("4,7"): the demo shows averages, not float noise. */
export function formatRanking(ranking: number): string {
  return ranking.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** A 1–5 rating as filled and empty stars, e.g. "★★★★☆". */
export function formatStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
