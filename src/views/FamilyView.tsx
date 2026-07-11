import { useState, type FormEvent } from "react";
import {
  SERVICE_TYPES,
  type Collaborator,
  type ServiceRequest,
  type ServiceType,
  type ValCuraStore,
} from "../store/store";
import { FAMILY_MEMBERS, PAST_REPORTS } from "../store/seed";
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
  const report = store.currentReport(member.recipientId);
  const pastReports = PAST_REPORTS.filter((p) => p.recipientId === member.recipientId);

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

      <section aria-labelledby="report-title">
        <h2 id="report-title">Il report della settimana</h2>
        <article className="report-card">
          <p className="report-week">
            Dal {formatDate(report.from)} al {formatDate(report.to)}
          </p>
          <p>
            Cara famiglia, ecco come sta andando la settimana di{" "}
            {recipientName(member.recipientId)}.
          </p>
          {report.entries.length === 0 ? (
            <p>
              Non ci sono ancora interventi completati questa settimana: vi racconteremo qui ogni
              visita, appena conclusa.
            </p>
          ) : (
            <ul className="report-entries">
              {report.entries.map((entry) => (
                <li key={entry.requestId}>
                  <strong>{formatDate(entry.date)}</strong> · {SERVICE_LABELS[entry.service]} con{" "}
                  {entry.collaboratorName}
                  <p className="report-note">“{entry.note}”</p>
                </li>
              ))}
            </ul>
          )}
          <p className="report-signoff">Un caro saluto dalla valle — il team ValCura</p>
        </article>
      </section>

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

      {pastReports.length > 0 && (
        <section aria-labelledby="archive-title">
          <h2 id="archive-title">Archivio dei report</h2>
          <ul className="report-archive">
            {pastReports.map((past) => (
              <li key={past.id}>
                <details className="report-card">
                  <summary>Settimana {past.weekLabel}</summary>
                  {past.paragraphs.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                  <p className="report-signoff">Un caro saluto dalla valle — il team ValCura</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
