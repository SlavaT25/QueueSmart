import { useState } from "react";
import Navbar from "../components/Navbar";
import { api, setCurrentUser } from "../api";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
      .then(({ user }) => { setCurrentUser(user); navigate(user.role === "Administrator" ? "/admin" : "/dashboard"); })
      .catch((reason) => setError(reason.message));
  };

  return (
    <div>
      <Navbar />
      
      <h1>QueueSmart</h1>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email" type="email" required
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password" type="password" required
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p role="alert">{error}</p>}
        <button type="submit">Login</button>

        <p>
          Don't have an account? <a href="/register">Register</a>
        </p>
      </form>
    </div>
  );
}

export default Login;
