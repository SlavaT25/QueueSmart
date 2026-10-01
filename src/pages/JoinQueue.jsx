import { useState } from "react";
import Navbar from "../components/Navbar";

function JoinQueue() {
  const [service, setService] = useState("");

  const services = [
    {
      name: "Advising",
      wait: 15,
    },
    {
      name: "Student Services",
      wait: 25,
    },
    {
      name: "Technical Support",
      wait: 10,
    },
  ];

  const handleJoinQueue = (event) => {
    event.preventDefault();

    if (!service) {
      alert("Please select a service.");
      return;
    }

    alert(You joined the ${service} queue.);
  };

  return (
    <div>
      <Navbar />

      <main>
        <h1>Join Queue</h1>

        <form onSubmit={handleJoinQueue}>
          <label htmlFor="service">Select Service</label>

          <select
            id="service"
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="">-- Select a service --</option>

            {services.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          {service && (
            <p>
              Estimated Wait:{" "}
              {services.find((item) => item.name === service)?.wait} minutes
            </p>
          )}

          <button type="submit">Join Queue</button>
        </form>
      </main>
    </div>
  );
}

export default JoinQueue;