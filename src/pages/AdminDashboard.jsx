import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../api";

function AdminDashboard() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(() => api("/services").then(({ services: list }) => setServices(list)).catch((reason) => setError(reason.message)), []);
  useEffect(() => { load(); }, [load]);
  const activeCount = services.reduce((sum, service) => sum + service.queueLength, 0);
  const openCount = services.filter((service) => service.open).length;

  const toggleQueue = async (service) => {
    setError("");
    try {
      await api(`/services/${service.id}/open`, { method: "PATCH", body: JSON.stringify({ open: !service.open }) });
      load();
    } catch (reason) { setError(reason.message); }
  };

  return <div className="app-shell"><Navbar /><main className="dashboard-page">
    <header className="dashboard-hero admin-hero">
      <div><span className="eyebrow">QUEUESMART · ADMINISTRATOR / STAFF</span><h1>Queue control center</h1><p>Manage services, monitor live demand, and keep every queue moving.</p></div>
      <Link className="primary-link" to="/queue-management">Open queue manager <span aria-hidden="true">↗</span></Link>
    </header>

    {error && <p className="error-banner" role="alert">{error}</p>}

    <section className="metric-grid" aria-label="Queue metrics">
      <article className="metric-card"><span className="metric-icon">▤</span><span className="metric-label">Total waiting</span><strong>{activeCount}</strong><small>people across all queues</small></article>
      <article className="metric-card"><span className="metric-icon green">●</span><span className="metric-label">Services open</span><strong>{openCount}<small className="metric-total"> / {services.length}</small></strong><small>accepting new arrivals</small></article>
      <article className="metric-card"><span className="metric-icon violet">◷</span><span className="metric-label">Queue services</span><strong>{services.length}</strong><small>configured in QueueSmart</small></article>
    </section>

    <section className="section-heading"><div><span className="eyebrow">UML · ADMIN WORKFLOW</span><h2>Administrator workspace</h2></div><span className="section-caption">Your role connects to these QueueSmart modules</span></section>
    <section className="workflow-board admin-workflow">
      <article className="workflow-node actor-node admin-actor"><span className="node-kicker">ACTOR</span><div className="actor-avatar">A</div><h3>Administrator</h3><p>Staff account</p></article>
      <div className="workflow-connector"><span>›</span><small>MANAGES</small></div>
      <div className="workflow-actions">
        <Link to="/admin/services" className="workflow-node action-node"><span className="node-kicker">SERVICE MANAGEMENT</span><strong>Manage services</strong><span>Create services and set priority, duration, and availability.</span><b>Open service manager <i>↗</i></b></Link>
        <Link to="/queue-management" className="workflow-node action-node"><span className="node-kicker">QUEUE MANAGEMENT</span><strong>Manage queues</strong><span>View arrivals in priority order and serve the next person.</span><b>Open queue manager <i>↗</i></b></Link>
      </div>
      <div className="workflow-connector"><span>›</span><small>POWERED BY</small></div>
      <div className="module-stack">
        <article className="workflow-node module-node"><span className="module-mark">Q</span><div><strong>Queue &amp; Priority</strong><span>Arrival order, service priority, estimated wait</span></div></article>
        <article className="workflow-node module-node"><span className="module-mark purple">N</span><div><strong>Notification Service</strong><span>Join and near-service alerts for users</span></div></article>
        <article className="workflow-node module-node"><span className="module-mark blue">M</span><div><strong>Queue Metrics</strong><span>Live queue length and open service count</span></div></article>
      </div>
    </section>

    <section className="section-heading service-heading"><div><span className="eyebrow">LIVE OVERVIEW</span><h2>Service queues</h2></div><Link to="/admin/services" className="text-link">Manage all services <span>→</span></Link></section>
    <section className="service-grid" aria-label="Service queue overview">
      {services.map((service) => <article className="service-card" key={service.id}>
        <div className="service-card-top"><span className={`status-dot ${service.open ? "is-open" : "is-closed"}`} />{service.open ? "Open" : "Closed"}<span className="service-priority">{service.priority} priority</span></div>
        <h3>{service.name}</h3><p>{service.description}</p>
        <div className="service-card-stats"><span><strong>{service.queueLength}</strong> waiting</span><span><strong>{service.expectedDuration}</strong> min / visit</span></div>
        <button className="subtle-button" type="button" onClick={() => toggleQueue(service)}>{service.open ? "Close queue" : "Reopen queue"}</button>
      </article>)}
      {!services.length && <p className="empty-state">Loading services…</p>}
    </section>
  </main></div>;
}

export default AdminDashboard;
