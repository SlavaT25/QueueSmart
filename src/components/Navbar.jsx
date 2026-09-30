function Navbar() {
  return (
    <nav>
      <h2>QueueSmart</h2>

      <div>
        <a href="/">Login</a>
        {" | "}
        <a href="/register">Register</a>
        {" | "}
        <a href="/dashboard">Dashboard</a>
        {" | "}
        <a href="/history">History</a>
      </div>
    </nav>
  );
}

export default Navbar;