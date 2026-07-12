import type { CareRecipient, Collaborator, FamilyMember, PastReport, ServiceRequest } from "./store";

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
 * Luca's low ratings count keeps his average mobile: one family rating during
 * the pitch visibly swaps him with Franca in the suggestions.
 */
export function seedCollaborators(): Collaborator[] {
  return [
    {
      id: "c-omar",
      name: "Omar Bazzana",
      zone: "Bassa valle",
      availableToday: false,
      ranking: 4.8,
      ratingsCount: 25,
      thanksCount: 18,
    },
    {
      id: "c-sara",
      name: "Sara Ghirardelli",
      zone: "Alta valle",
      availableToday: true,
      ranking: 4.9,
      ratingsCount: 31,
      thanksCount: 12,
    },
    {
      id: "c-franca",
      name: "Franca Damioli",
      zone: "Media valle",
      availableToday: true,
      ranking: 4.5,
      ratingsCount: 12,
      thanksCount: 7,
    },
    {
      id: "c-luca",
      name: "Luca Bettoni",
      zone: "Media valle",
      availableToday: true,
      ranking: 4.7,
      ratingsCount: 9,
      thanksCount: 5,
    },
  ];
}

/**
 * The report archive, pre-written in the report's warm tone. Static content:
 * past weeks don't change, so they live outside the mutable state.
 */
export const PAST_REPORTS: readonly PastReport[] = [
  {
    id: "rep-maria-1",
    recipientId: "a-maria",
    weekLabel: "29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, è stata una settimana serena per la sig.ra Maria. Martedì Franca è passata per la spesa: al mercato hanno scelto insieme le albicocche per la marmellata, e Maria le ha promesso un vasetto.",
      "Giovedì Luca l'ha accompagnata dalla parrucchiera in paese. Al ritorno si sono fermati al belvedere: Maria dice che la valle, vista da lì, «è ancora quella di quando era ragazza».",
    ],
  },
  {
    id: "rep-maria-2",
    recipientId: "a-maria",
    weekLabel: "22 – 28 giugno 2026",
    paragraphs: [
      "Cara famiglia, settimana tranquilla e in compagnia. Lunedì la consegna dei farmaci è arrivata puntuale, e Franca ne ha approfittato per due chiacchiere in cucina davanti al caffè.",
      "Sabato Maria ha voluto sistemare i gerani sul balcone: Luca le ha portato il terriccio e ora, parole sue, «il balcone è il più bello della via».",
    ],
  },
  {
    id: "rep-giovanni-1",
    recipientId: "a-giovanni",
    weekLabel: "29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, il sig. Giovanni sta bene. Mercoledì Sara è salita con i farmaci e la ricetta nuova del dott. Marchesi; ne hanno approfittato per una passeggiata fino alla fontana.",
      "Giovanni continua con le parole crociate ogni sera: ci ha sfidato a trovare «un fiume di tre lettere». Ha vinto lui.",
    ],
  },
  {
    id: "rep-pierina-1",
    recipientId: "a-pierina",
    weekLabel: "29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, la sig.ra Pierina vi saluta. Venerdì Omar ha fatto la spesa seguendo la lista sul frigo, senza dimenticare i biscotti «quelli buoni, non quelli in offerta».",
      "Domenica pomeriggio ha ricevuto la visita della vicina e insieme hanno ascoltato la messa alla radio. Ci ha chiesto di dirvi che il rosmarino sul davanzale è fiorito.",
    ],
  },
  {
    id: "rep-ercole-1",
    recipientId: "a-ercole",
    weekLabel: "29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, il sig. Ercole è in gran forma. Martedì Luca l'ha aiutato a ritirare il pacco in posta e al ritorno si sono fermati al bar per «il caffè dei campioni».",
      "Ercole ha ripreso a sistemare l'orto: dice che quest'anno i pomodori «faranno invidia a tutta la media valle». Noi gli crediamo.",
    ],
  },
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
      completedAt: isoDaysFromToday(-2),
    },
  ];
}
