import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api, getCurrentUser } from "../api";

function JoinQueue() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api("/services").then(({ services: list }) => setServices(list)).catch((reason) => setError(reason.message)); }, []);
  const selected = services.find((item) => item.id === serviceId);
  const handleJoin = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const { entry } = await api("/queue", { method: "POST", body: JSON.stringify({ userId: getCurrentUser()?.id, serviceId }) });
      setMessage('Joined ${entry.serviceName}. Position ${entry.position}; estimated wait ${entry.estimatedWait} minutes.');
    } catch (reason) { setError(reason.message); }
  };
  return <div><Navbar /><main><h1>Join Queue</h1><form onSubmit={handleJoin}>
    <label htmlFor="service">Select Service</label><select id="service" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
      <option value="">-- Select a service --</option>{services.filter((item) => item.open).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    {selected && <p>Expected duration: {selected.expectedDuration} minutes · Priority: {selected.priority}</p>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button type="submit">Join Queue</button>
  </form></main></div>;
}
export default JoinQueue;
