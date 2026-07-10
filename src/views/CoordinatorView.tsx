import { useState, type FormEvent } from "react";
import {
  SERVICE_TYPES,
  type ServiceRequest,
  type ServiceType,
  type RequestStatus,
  type ValCuraStore,
} from "../store/store";
import { CARE_RECIPIENTS } from "../store/seed";

const SERVICE_LABELS: Record<ServiceType, string> = {
  groceries: "Spesa",
  medications: "Farmaci",
  accompaniment: "Accompagnamento",
  errand: "Commissione",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "nuova",
  assigned: "assegnata",
  completed: "completata",
};

function localToday(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function recipientName(recipientId: string): string {
  return CARE_RECIPIENTS.find((r) => r.id === recipientId)?.name ?? "Assistito sconosciuto";
}

export function CoordinatorView({
  store,
  requests,
}: {
  store: ValCuraStore;
  requests: ServiceRequest[];
}) {
  const [recipientId, setRecipientId] = useState(CARE_RECIPIENTS[0].id);
  const [service, setService] = useState<ServiceType>("groceries");
  const [dueDate, setDueDate] = useState(localToday());
  const [notes, setNotes] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    store.createRequest({ recipientId, service, dueDate, notes: notes.trim() });
    setNotes("");
  }

  return (
    <div className="coordinator">
      <section aria-labelledby="new-request-title">
        <h2 id="new-request-title">Nuova richiesta da telefonata</h2>
        <form className="request-form" onSubmit={handleSubmit}>
          <label>
            Assistito
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              {CARE_RECIPIENTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo di servizio
            <select value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data desiderata
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="notes-field">
            Note
            <textarea
              rows={2}
              placeholder="Es. citofonare due volte, la lista è appesa al frigo…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button type="submit" className="primary">
            Registra richiesta
          </button>
        </form>
      </section>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title">Coda richieste</h2>
        <ul className="queue">
          {requests.map((request) => (
            <li key={request.id} className="request-card">
              <div className="request-head">
                <strong>{recipientName(request.recipientId)}</strong>
                <span className={`badge ${request.status}`}>{STATUS_LABELS[request.status]}</span>
              </div>
              <div className="request-meta">
                {SERVICE_LABELS[request.service]} · {formatDate(request.dueDate)}
              </div>
              {request.notes !== "" && <p className="request-notes">{request.notes}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
