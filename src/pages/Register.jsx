import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, setCurrentUser } from "../api";

function Register() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    api("/auth/register", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) })
      .then(({ user }) => { setCurrentUser(user); navigate("/dashboard"); }).catch((reason) => setError(reason.message));
  };
  return (
    <div>
      <Navbar />
      <h1>QueueSmart</h1>
      <h2>Create an Account</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" maxLength="80" required />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" maxLength="254" placeholder="Enter your email" required />

        <label>Password</label>
        <input name="password" type="password" minLength="8" maxLength="128" placeholder="Create a password" required />

        {error && <p role="alert">{error}</p>}
        <button type="submit">Register</button>
        <p>
          Already have an account? <a href="/">Login</a>
        </p>
      </form>
    </div>
  );
}

export default Register;
