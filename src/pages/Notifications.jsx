import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api, getCurrentUser, query } from "../api";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { const user = getCurrentUser(); if (user) api(/notifications?${query({ userId: user.id })}).then(({ notifications: data }) => setNotifications(data)).catch((reason) => setError(reason.message)); }, []);
  return <div><Navbar /><main><h1>Notifications</h1>{error && <p role="alert">{error}</p>}{notifications.length ? notifications.map((item) => <section key={item.id}><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></section>) : <p>No notifications yet.</p>}</main></div>;
}
export default Notifications;