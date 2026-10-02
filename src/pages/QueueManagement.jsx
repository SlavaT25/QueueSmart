import { useState } from "react";
import Navbar from "../components/Navbar";

function QueueManagement() {
  const [queue, setQueue] = useState([
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" },
    { id: 3, name: "User 3" },
    { id: 4, name: "User 4" },
  ]);

  const serveNext = () => {
    if (queue.length === 0) {
      alert("The queue is empty.");
      return;
    }

    alert(`${queue[0].name} is being served.`);

    setQueue(queue.slice(1));
  };

  const removeUser = (id) => {
    setQueue(queue.filter((user) => user.id !== id));
  };

  return (
    <div>
      <Navbar />

      <main>
        <h1>Queue Management</h1>

        <h2>Current Queue</h2>

        {queue.length === 0 ? (
          <p>No users in queue.</p>
        ) : (
          <ul>
            {queue.map((user, index) => (
              <li key={user.id}>
                Position {index + 1}: {user.name}

                <button onClick={() => removeUser(user.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <button onClick={serveNext}>Serve Next</button>
      </main>
    </div>
  );
}

export default QueueManagement;