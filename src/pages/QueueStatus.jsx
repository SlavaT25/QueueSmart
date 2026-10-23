import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api, getCurrentUser, query } from "../api";

function QueueStatus() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const user = getCurrentUser();
  const refresh = useCallback(() => user && api(/queue/mine?${query({ userId: user.id })}).then(({ entries: data }) => setEntries(data)).catch((reason) => setError(reason.message)), [user]);
  useEffect(() => { refresh(); }, [refresh]);
  const leave = async (entry) => {
    try { await api(/queue/${entry.id}?${query({ userId: user.id })}, { method: "DELETE" }); refresh(); }
    catch (reason) { setError(reason.message); }
  };
  return <div><Navbar /><main><h1>Queue Status</h1>{error && <p role="alert">{error}</p>}{entries.length === 0 ? <p>No active queue.</p> : entries.map((entry) => <section key={entry.id}>
    <h2>{entry.serviceName}</h2><p>Position: {entry.position}</p><p>Estimated wait: {entry.estimatedWait} minutes</p><p>Status: {entry.status}</p><button onClick={() => leave(entry)}>Leave Queue</button>
  </section>)}</main></div>;
}
export default QueueStatus;