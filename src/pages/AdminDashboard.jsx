import { useState } from "react";
import Navbar from "../components/Navbar";

function AdminDashboard() {
  const [services, setServices] = useState([
    {
      name: "Advising",
      queueLength: 8,
      status: "Open",
    },
    {
      name: "Student Services",
      queueLength: 5,
      status: "Open",
    },
    {
      name: "Technical Support",
      queueLength: 0,
      status: "Closed",
    },
  ]);

  const handleToggleQueue = (serviceName) => {
    setServices((currentServices) =>
      currentServices.map((service) =>
        service.name === serviceName
          ? {
              ...service,
              status: service.status === "Open" ? "Closed" : "Open",
            }
          : service
      )
    );
  };

  return (
    <div>
      <Navbar />

      <main>
        <h1>Admin Dashboard</h1>

        <h2>Services</h2>

        {services.map((service) => (
          <section key={service.name}>
            <h3>{service.name}</h3>

            <p>Queue Length: {service.queueLength}</p>
            <p>Status: {service.status}</p>

            <button onClick={() => handleToggleQueue(service.name)}>
              {service.status === "Open" ? "Close Queue" : "Open Queue"}
            </button>
          </section>
        ))}
      </main>
    </div>
  );
}

export default AdminDashboard;