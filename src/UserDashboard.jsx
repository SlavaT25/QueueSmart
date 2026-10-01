import Navbar from "../components/Navbar";

function UserDashboard() {
  return (
    <div>
      <Navbar />

      <main>
        <h1>User Dashboard</h1>

        <section>
          <h2>Current Queue</h2>
          <p>No active queue.</p>
        </section>

        <section>
          <h2>Active Services</h2>

          <ul>
            <li>Advising</li>
            <li>Student Services</li>
            <li>Technical Support</li>
          </ul>
        </section>

        <section>
          <h2>Notifications</h2>
          <p>No new notifications.</p>
        </section>
      </main>
    </div>
  );
}

export default UserDashboard;