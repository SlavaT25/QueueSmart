import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api, getCurrentUser, query } from "../api";

function History() {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { const user = getCurrentUser(); if (user) api(/history?${query({ userId: user.id })}).then(({ history: data }) => setHistory(data)).catch((reason) => setError(reason.message)); }, []);
  return <div><Navbar /><main><h1>Queue History</h1>{error && <p role="alert">{error}</p>}<table><thead><tr><th>Date</th><th>Service</th><th>Outcome</th></tr></thead><tbody>
    {history.map((item) => <tr key={item.id}><td>{new Date(item.joinedAt).toLocaleString()}</td><td>{item.serviceName}</td><td>{item.outcome}</td></tr>)}
  </tbody></table>{history.length === 0 && <p>No queue history yet.</p>}</main></div>;
}
export default History;