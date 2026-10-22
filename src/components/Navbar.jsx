import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api";

function Navbar() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("queuesmart.user");
    navigate("/");
  };
  return (
    <nav>
      <h2>QueueSmart</h2>

      <div>
        {!user ? <>
          <Link to="/">Login</Link>{" | "}<Link to="/register">Register</Link>
        </> : user.role === "Administrator" ? <>
          <Link to="/admin">Admin Dashboard</Link>{" | "}
          <Link to="/admin/services">Service Management</Link>{" | "}
          <Link to="/queue-management">Queue Management</Link>{" | "}
          <button type="button" onClick={logout}>Log out</button>
        </> : <>
          <Link to="/dashboard">Dashboard</Link>{" | "}
          <Link to="/join-queue">Join Queue</Link>{" | "}
          <Link to="/queue-status">Queue Status</Link>{" | "}
          <Link to="/history">History</Link>{" | "}
          <Link to="/notifications">Notifications</Link>{" | "}
          <button type="button" onClick={logout}>Log out</button>
        </>}
      </div>
    </nav>
  );
}

export default Navbar;
