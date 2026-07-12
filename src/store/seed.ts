import type {
  CareRecipient,
  Collaborator,
  FamilyMember,
  PastReport,
  PlanId,
  ServiceRequest,
} from "./store";

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
 * Plans spread across the whole catalog, so the Admin list shows variety and
 * the Basic families prove the monthly report during the pitch.
 */
export function seedPlans(): Record<string, PlanId> {
  return {
    "a-maria": "premium",
    "a-giovanni": "family-care",
    "a-pierina": "basic",
    "a-ercole": "basic",
  };
}

/**
 * The report archive, pre-written in the report's warm tone. Static content:
 * past periods don't change, so they live outside the mutable state. Labels
 * follow each client's plan: weekly for Premium/Family Care, monthly for Basic.
 */
export const PAST_REPORTS: readonly PastReport[] = [
  {
    id: "rep-maria-1",
    recipientId: "a-maria",
    periodLabel: "Settimana 29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, è stata una settimana serena per la sig.ra Maria. Martedì Franca è passata per la spesa: al mercato hanno scelto insieme le albicocche per la marmellata, e Maria le ha promesso un vasetto.",
      "Giovedì Luca l'ha accompagnata dalla parrucchiera in paese. Al ritorno si sono fermati al belvedere: Maria dice che la valle, vista da lì, «è ancora quella di quando era ragazza».",
    ],
  },
  {
    id: "rep-maria-2",
    recipientId: "a-maria",
    periodLabel: "Settimana 22 – 28 giugno 2026",
    paragraphs: [
      "Cara famiglia, settimana tranquilla e in compagnia. Lunedì la consegna dei farmaci è arrivata puntuale, e Franca ne ha approfittato per due chiacchiere in cucina davanti al caffè.",
      "Sabato Maria ha voluto sistemare i gerani sul balcone: Luca le ha portato il terriccio e ora, parole sue, «il balcone è il più bello della via».",
    ],
  },
  {
    id: "rep-giovanni-1",
    recipientId: "a-giovanni",
    periodLabel: "Settimana 29 giugno – 5 luglio 2026",
    paragraphs: [
      "Cara famiglia, il sig. Giovanni sta bene. Mercoledì Sara è salita con i farmaci e la ricetta nuova del dott. Marchesi; ne hanno approfittato per una passeggiata fino alla fontana.",
      "Giovanni continua con le parole crociate ogni sera: ci ha sfidato a trovare «un fiume di tre lettere». Ha vinto lui.",
      "A giovedì per la telefonata del vostro piano Family Care: il sig. Giovanni ha già pronti gli aneddoti della settimana.",
    ],
  },
  {
    id: "rep-pierina-1",
    recipientId: "a-pierina",
    periodLabel: "Giugno 2026",
    paragraphs: [
      "Cara famiglia, ecco il racconto del mese della sig.ra Pierina. La spesa del venerdì con Omar è ormai un rito: lista appesa al frigo e biscotti «quelli buoni, non quelli in offerta» mai dimenticati.",
      "A metà mese Omar l'ha accompagnata in farmacia per le scorte dell'estate; al ritorno hanno salutato mezza via, perché la sig.ra Pierina conosce tutti.",
      "Le domeniche sono passate in compagnia della vicina, con la messa alla radio. Ci ha chiesto di dirvi che il rosmarino sul davanzale è fiorito.",
    ],
  },
  {
    id: "rep-ercole-1",
    recipientId: "a-ercole",
    periodLabel: "Giugno 2026",
    paragraphs: [
      "Cara famiglia, un mese in gran forma per il sig. Ercole. Con Luca è diventato un appuntamento fisso: commissioni in paese il martedì e, al ritorno, «il caffè dei campioni» al bar della piazza.",
      "A giugno ha rimesso in sesto l'orto: Franca gli ha portato le canne per i pomodori, che quest'anno — parole sue — «faranno invidia a tutta la media valle». Noi gli crediamo.",
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

/**
 * The whole lifecycle at first glance: every status, both entry channels among
 * the pending requests, and one intervention already rated with a thank-you.
 * Maria's completed accompaniment stays unrated on purpose: it lets the pitch
 * demo a rating without first walking the full lifecycle.
 */
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
      id: "r-seed-4",
      recipientId: "a-pierina",
      service: "accompaniment",
      channel: "family",
      dueDate: isoDaysFromToday(2),
      notes: "Visita dal medico di base alle 10, l'appuntamento è già prenotato — grazie!",
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
    {
      id: "r-seed-5",
      recipientId: "a-ercole",
      service: "errand",
      channel: "phone",
      dueDate: isoDaysFromToday(-3),
      notes: "Ritirare il pacco in posta con la delega firmata",
      status: "completed",
      assigneeId: "c-franca",
      completionNote:
        "Pacco ritirato e consegnato. Il sig. Ercole mi ha mostrato l'orto: i pomodori promettono davvero bene.",
      completedAt: isoDaysFromToday(-3),
      review: { rating: 5, thanks: "Grazie Franca, papà ci ha raccontato tutto al telefono: era contentissimo." },
    },
  ];
}
