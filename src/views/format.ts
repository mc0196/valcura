import type { RequestChannel, RequestStatus, ServiceType } from "../store/store";
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

/** Local calendar date (YYYY-MM-DD), matching how requests store their due date. */
export function localToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

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
