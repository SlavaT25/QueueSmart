import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import JoinQueue from "./pages/JoinQueue";
import QueueStatus from "./pages/QueueStatus";
import AdminDashboard from "./pages/AdminDashboard";
import ServiceManagement from "./pages/ServiceManagement";
import QueueManagement from "./pages/QueueManagement";
import History from "./pages/History";
import Notifications from "./pages/Notifications";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/join-queue" element={<JoinQueue />} />
        <Route path="/queue-status" element={<QueueStatus />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/services" element={<ServiceManagement />} />

        <Route path="/queue-management" element={<QueueManagement />} />
        <Route path="/history" element={<History />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;