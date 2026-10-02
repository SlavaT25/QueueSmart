import Navbar from "../components/Navbar";

function QueueStatus() {
  const handleLeaveQueue = () => {
    alert("You have left the queue.");
  };

  return (
    <div>
      <Navbar />

      <main>
        <h1>Queue Status</h1>

        <section>
          <h2>Current Position</h2>
          <p>Position: 4</p>
        </section>

        <section>
          <h2>Estimated Wait</h2>
          <p>Approximately 20 minutes</p>
        </section>

        <section>
          <h2>Status</h2>
          <p>Waiting</p>
        </section>

        <button onClick={handleLeaveQueue}>Leave Queue</button>
      </main>
    </div>
  );
}

export default QueueStatus;