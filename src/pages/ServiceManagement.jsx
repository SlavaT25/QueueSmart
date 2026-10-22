import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../api";

function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");
  const load = () => api("/services").then(({ services: list }) => setServices(list)).catch((reason) => setError(reason.message));
  useEffect(() => { load(); }, []);
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); const formElement = event.currentTarget; const form = new FormData(formElement);
    try { await api("/services", { method: "POST", body: JSON.stringify({ name: form.get("name"), description: form.get("description"), expectedDuration: Number(form.get("duration")), priority: form.get("priority") }) }); formElement.reset(); load(); }
    catch (reason) { setError(reason.message); }
  };
  const toggle = async (service) => { try { await api(`/services/${service.id}/open`, { method: "PATCH", body: JSON.stringify({ open: !service.open }) }); load(); } catch (reason) { setError(reason.message); } };
  return <div><Navbar /><main><h1>Service Management</h1>{error && <p role="alert">{error}</p>}<h2>Services</h2>{services.map((service) => <section key={service.id}><h3>{service.name}</h3><p>{service.description}</p><p>{service.expectedDuration} minutes · {service.priority} priority · {service.open ? "Open" : "Closed"}</p><button onClick={() => toggle(service)}>{service.open ? "Close Queue" : "Open Queue"}</button></section>)}
    <h2>Create Service</h2><form onSubmit={handleSubmit}><label htmlFor="serviceName">Service Name</label><input id="serviceName" name="name" maxLength="100" required />
    <label htmlFor="description">Description</label><textarea id="description" name="description" maxLength="500" required />
    <label htmlFor="duration">Expected Duration (minutes)</label><input id="duration" name="duration" type="number" min="1" max="480" required />
    <label htmlFor="priority">Priority</label><select id="priority" name="priority"><option>Low</option><option>Medium</option><option>High</option></select><button type="submit">Create Service</button></form>
  </main></div>;
}
export default ServiceManagement;
