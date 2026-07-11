import { useState, type FormEvent } from "react";
import {
  SERVICE_TYPES,
  type Collaborator,
  type ServiceRequest,
  type ServiceType,
  type ValCuraStore,
} from "../store/store";
import { FAMILY_MEMBERS } from "../store/seed";
import { SERVICE_LABELS, STATUS_LABELS, formatDate, localToday, recipientName } from "./format";

export function FamilyView({
  store,
  requests,
  collaborators,
}: {
  store: ValCuraStore;
  requests: ServiceRequest[];
  collaborators: Collaborator[];
}) {
  const [memberId, setMemberId] = useState(FAMILY_MEMBERS[0].id);
  const [service, setService] = useState<ServiceType>("groceries");
  const [dueDate, setDueDate] = useState(localToday());
  const [notes, setNotes] = useState("");

  const member = FAMILY_MEMBERS.find((m) => m.id === memberId) ?? FAMILY_MEMBERS[0];
  const myRequests = requests.filter((r) => r.recipientId === member.recipientId);

  function collaboratorName(collaboratorId: string): string {
    return collaborators.find((c) => c.id === collaboratorId)?.name ?? "Collaboratore sconosciuto";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    store.createRequest({
      recipientId: member.recipientId,
      service,
      channel: "family",
      dueDate,
      notes: notes.trim(),
    });
    setNotes("");
  }

  return (
    <div className="family">
      <label className="impersonation">
        Stai impersonando
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {FAMILY_MEMBERS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.city}
            </option>
          ))}
        </select>
      </label>

      <section aria-labelledby="family-request-title">
        <h2 id="family-request-title">
          Nuova richiesta per {recipientName(member.recipientId)}
        </h2>
        <form className="request-form" onSubmit={handleSubmit}>
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
              placeholder="Es. la mamma ha finito le medicine per la pressione…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button type="submit" className="primary">
            Invia richiesta
          </button>
        </form>
      </section>

      <section aria-labelledby="family-requests-title">
        <h2 id="family-requests-title">Le richieste per {recipientName(member.recipientId)}</h2>
        {myRequests.length === 0 ? (
          <p>Nessuna richiesta al momento.</p>
        ) : (
          <ul className="queue">
            {myRequests.map((request) => (
              <li key={request.id} className="request-card">
                <div className="request-head">
                  <strong>{SERVICE_LABELS[request.service]}</strong>
                  <span className={`badge ${request.status}`}>
                    {STATUS_LABELS[request.status]}
                  </span>
                </div>
                <div className="request-meta">
                  {formatDate(request.dueDate)}
                  {request.assigneeId !== undefined && (
                    <> · se ne occupa {collaboratorName(request.assigneeId)}</>
                  )}
                </div>
                {request.notes !== "" && <p className="request-notes">{request.notes}</p>}
                {request.completionNote !== undefined && (
                  <p className="completion-note">“{request.completionNote}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
