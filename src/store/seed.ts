import type { CareRecipient, Collaborator, FamilyMember, ServiceRequest } from "./store";

/** Seed data stays in Italian: the demo must feel like a service already alive in the valley. */
export const CARE_RECIPIENTS: readonly CareRecipient[] = [
  { id: "a-maria", name: "Maria Pedretti", zone: "Media valle" },
  { id: "a-giovanni", name: "Giovanni Fanchini", zone: "Alta valle" },
  { id: "a-pierina", name: "Pierina Gasparini", zone: "Bassa valle" },
  { id: "a-ercole", name: "Ercole Salvetti", zone: "Media valle" },
];

/** One relative per recipient, all living outside the valley: the remote channel's users. */
export const FAMILY_MEMBERS: readonly FamilyMember[] = [
  { id: "f-anna", name: "Anna Pedretti", recipientId: "a-maria", city: "Milano" },
  { id: "f-marco", name: "Marco Fanchini", recipientId: "a-giovanni", city: "Torino" },
  { id: "f-carla", name: "Carla Gasparini", recipientId: "a-pierina", city: "Bergamo" },
  { id: "f-elio", name: "Elio Salvetti", recipientId: "a-ercole", city: "Brescia" },
];

/**
 * Zones, availability and rankings are spread out so the suggestion list visibly
 * reorders during the pitch (zone match, busy collaborator, unavailable one).
 * Deliberately NOT in suggestion order, so tests catch a missing sort.
 */
export function seedCollaborators(): Collaborator[] {
  return [
    {
      id: "c-omar",
      name: "Omar Bazzana",
      zone: "Bassa valle",
      availableToday: false,
      ranking: 4.8,
    },
    {
      id: "c-sara",
      name: "Sara Ghirardelli",
      zone: "Alta valle",
      availableToday: true,
      ranking: 4.9,
    },
    {
      id: "c-franca",
      name: "Franca Damioli",
      zone: "Media valle",
      availableToday: true,
      ranking: 4.5,
    },
    { id: "c-luca", name: "Luca Bettoni", zone: "Media valle", availableToday: true, ranking: 4.7 },
  ];
}

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
      channel: "phone",
      dueDate: isoDaysFromToday(1),
      notes: "Ritirare la ricetta dal dott. Marchesi prima della farmacia",
      status: "new",
    },
    {
      id: "r-seed-2",
      recipientId: "a-pierina",
      service: "groceries",
      channel: "phone",
      dueDate: isoDaysFromToday(0),
      notes: "Lista appesa al frigo, pagare con la busta nel cassetto",
      status: "assigned",
      assigneeId: "c-omar",
    },
    {
      id: "r-seed-3",
      recipientId: "a-maria",
      service: "accompaniment",
      channel: "family",
      dueDate: isoDaysFromToday(-2),
      notes: "Visita di controllo in ospedale, portare il libretto sanitario",
      status: "completed",
      assigneeId: "c-sara",
      completionNote: "Visita andata bene, la sig.ra Maria è serena. Prossimo controllo tra sei mesi.",
    },
  ];
}
