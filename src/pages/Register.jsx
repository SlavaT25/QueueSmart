function Register() {
  return (
    <div>
      <h1>QueueSmart</h1>
      <h2>Create an Account</h2>

      <form>
        <label>Email</label>
        <input type="email" placeholder="Enter your email" />

        <label>Password</label>
        <input type="password" placeholder="Create a password" />

        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;