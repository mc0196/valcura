import type { CareRecipient, ServiceRequest } from "./store";

/** Seed data stays in Italian: the demo must feel like a service already alive in the valley. */
export const CARE_RECIPIENTS: readonly CareRecipient[] = [
  { id: "a-maria", name: "Maria Pedretti" },
  { id: "a-giovanni", name: "Giovanni Fanchini" },
  { id: "a-pierina", name: "Pierina Gasparini" },
  { id: "a-ercole", name: "Ercole Salvetti" },
];

/** Local calendar date (YYYY-MM-DD), so seed dates track the day of the pitch. */
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** One request per status, so the queue demonstrates the whole lifecycle at first glance. */
export function seedRequests(): ServiceRequest[] {
  return [
    {
      id: "r-seed-1",
      recipientId: "a-giovanni",
      service: "medications",
      dueDate: isoDaysFromToday(1),
      notes: "Ritirare la ricetta dal dott. Marchesi prima della farmacia",
      status: "new",
    },
    {
      id: "r-seed-2",
      recipientId: "a-pierina",
      service: "groceries",
      dueDate: isoDaysFromToday(0),
      notes: "Lista appesa al frigo, pagare con la busta nel cassetto",
      status: "assigned",
    },
    {
      id: "r-seed-3",
      recipientId: "a-maria",
      service: "accompaniment",
      dueDate: isoDaysFromToday(-2),
      notes: "Visita di controllo in ospedale, portare il libretto sanitario",
      status: "completed",
    },
  ];
}
