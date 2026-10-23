import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../api";

function QueueManagement() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState("");
  const loadServices = useCallback(() => api("/services").then(({ services: list }) => { setServices(list); if (!serviceId && list.length) setServiceId(list[0].id); }).catch((reason) => setError(reason.message)), [serviceId]);
  const loadQueue = useCallback((id) => id && api('/queue?serviceId=${encodeURIComponent(id)}').then(({ entries }) => setQueue(entries)).catch((reason) => setError(reason.message)), []);
  useEffect(() => { loadServices(); }, [loadServices]);
  useEffect(() => { loadQueue(serviceId); }, [serviceId, loadQueue]);
  const serveNext = async () => { try { const { entry } = await api('/queue/${serviceId}/serve-next', { method: "POST" }); setError('${entry.userName} was served.'); loadQueue(serviceId); } catch (reason) { setError(reason.message); } };
  return <div><Navbar /><main><h1>Queue Management</h1><label htmlFor="service">Service</label><select id="service" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
    {error && <p role="status">{error}</p>}<h2>Current Queue</h2>{queue.length ? <ol>{queue.map((entry) => <li key={entry.id}>{entry.userName} — {entry.priority} priority · {entry.estimatedWait} min</li>)}</ol> : <p>No users in queue.</p>}<button onClick={serveNext} disabled={!queue.length}>Serve Next</button>
  </main></div>;
}
export default QueueManagement;
