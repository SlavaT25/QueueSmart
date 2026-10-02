import Navbar from "../components/Navbar";

function Notifications() {
  const notifications = [
    "Your position in the Advising queue is now 3.",
    "Your estimated wait time is 15 minutes.",
    "You are approaching the front of the queue.",
  ];

  return (
    <div>
      <Navbar />

      <main>
        <h1>Notifications</h1>

        {notifications.map((notification, index) => (
          <section key={index}>
            <p>{notification}</p>
          </section>
        ))}
      </main>
    </div>
  );
}

export default Notifications;