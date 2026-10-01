import { useState } from "react";
import Navbar from "../components/Navbar";

function ServiceManagement() {
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [priority, setPriority] = useState("Low");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!serviceName || !description || !duration) {
      alert("Please complete all required fields.");
      return;
    }

    if (serviceName.length > 100) {
      alert("Service name must be 100 characters or less.");
      return;
    }

    if (duration <= 0) {
      alert("Expected duration must be greater than 0.");
      return;
    }

    alert("Service created successfully!");
  };

  return (
    <div>
      <Navbar />

      <main>
        <h1>Service Management</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="serviceName">Service Name</label>

          <input
            id="serviceName"
            type="text"
            maxLength="100"
            value={serviceName}
            onChange={(event) => setServiceName(event.target.value)}
            required
          />

          <label htmlFor="description">Description</label>

          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />

          <label htmlFor="duration">
            Expected Duration (minutes)
          </label>

          <input
            id="duration"
            type="number"
            min="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
          />

          <label htmlFor="priority">Priority</label>

          <select
            id="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <button type="submit">Create Service</button>
        </form>
      </main>
    </div>
  );
}

export default ServiceManagement;
