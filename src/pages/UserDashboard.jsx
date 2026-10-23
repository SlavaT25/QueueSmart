import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, getCurrentUser, query } from "../api";

function UserDashboard() {
  const [services, setServices] = useState([]);
  const [entries, setEntries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const user = getCurrentUser();
  useEffect(() => {
    api("/services").then(({ services: items }) => setServices(items)).catch((reason) => setError(reason.message));
    if (user) {
      api(`/queue/mine?${query({ userId: user.id })}`).then(({ entries: items }) => setEntries(items)).catch((reason) => setError(reason.message));
      api(`/notifications?${query({ userId: user.id })}`).then(({ notifications: items }) => setNotifications(items)).catch((reason) => setError(reason.message));
    }
  }, []);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  return <div className="app-shell"><Navbar /><main className="dashboard-page">
    <header className="dashboard-hero user-hero">
      <div><span className="eyebrow">QUEUESMART · CUSTOMER / STUDENT</span><h1>Hi, {firstName}</h1><p>Join a service queue, follow your place, and get notified when your turn is close.</p></div>
      <Link className="primary-link" to="/join-queue">Join a queue <span aria-hidden="true">↗</span></Link>
    </header>
    {error && <p className="error-banner" role="alert">{error}</p>}

    <section className="section-heading"><div><span className="eyebrow">UML · USER WORKFLOW</span><h2>Your QueueSmart workspace</h2></div><span className="section-caption">A clear path from service to your turn</span></section>
    <section className="workflow-board user-workflow">
      <article className="workflow-node actor-node user-actor"><span className="node-kicker">ACTOR</span><div className="actor-avatar user-avatar">U</div><h3>Customer / Student</h3><p>Signed-in user</p></article>
      <div className="workflow-connector"><span>›</span><small>USES</small></div>
      <div className="workflow-actions">
        <Link to="/join-queue" className="workflow-node action-node"><span className="node-kicker">QUEUE ACCESS</span><strong>Join a service queue</strong><span>Choose an open service and get your estimated wait.</span><b>Browse services <i>↗</i></b></Link>
        <Link to="/queue-status" className="workflow-node action-node"><span className="node-kicker">QUEUE STATUS</span><strong>View your place</strong><span>Check your position, estimated wait, or leave a queue.</span><b>View queue status <i>↗</i></b></Link>
      </div>
      <div className="workflow-connector"><span>›</span><small>SUPPORTED BY</small></div>
      <div className="module-stack">
        <article className="workflow-node module-node"><span className="module-mark purple">A</span><div><strong>Authentication</strong><span>Account registration and sign-in</span></div></article>
        <Link to="/notifications" className="workflow-node module-node module-link"><span className="module-mark">N</span><div><strong>Notifications</strong><span>{notifications[0]?.message || "Queue join and near-service updates"}</span></div><i>↗</i></Link>
        <article className="workflow-node module-node"><span className="module-mark blue">E</span><div><strong>Wait estimate</strong><span>{entries.length ? `${entries[0].estimatedWait} minutes for your next queue` : "Position × expected service duration"}</span></div></article>
      </div>
    </section>

    <section className="section-heading service-heading"><div><span className="eyebrow">AVAILABLE NOW</span><h2>Service queues</h2></div><Link to="/join-queue" className="text-link">Join a queue <span>→</span></Link></section>
    <section className="service-grid" aria-label="Available services">
      {services.map((service) => <article className="service-card" key={service.id}>
        <div className="service-card-top"><span className={`status-dot ${service.open ? "is-open" : "is-closed"}`} />{service.open ? "Open" : "Closed"}<span className="service-priority">{service.priority} priority</span></div>
        <h3>{service.name}</h3><p>{service.description}</p>
        <div className="service-card-stats"><span><strong>{service.queueLength}</strong> waiting</span><span><strong>{service.expectedDuration}</strong> min / visit</span></div>
        <Link className={`subtle-button ${!service.open ? "is-disabled" : ""}`} to={service.open ? "/join-queue" : "#"} aria-disabled={!service.open}>{service.open ? "Join this queue" : "Queue closed"}</Link>
      </article>)}
      {!services.length && <p className="empty-state">Loading services…</p>}
    </section>

    <section className="active-queue-panel">
      <div><span className="eyebrow">YOUR CURRENT QUEUE</span><h2>{entries.length ? "You're in line" : "No active queue yet"}</h2><p>{entries.length ? `${entries[0].serviceName} · position ${entries[0].position} · about ${entries[0].estimatedWait} minutes` : "Join an open service to see your position and estimated wait here."}</p></div>
      <Link className="text-link" to={entries.length ? "/queue-status" : "/join-queue"}>{entries.length ? "View status" : "Find a service"} <span>→</span></Link>
    </section>
  </main></div>;
}

export default UserDashboard;