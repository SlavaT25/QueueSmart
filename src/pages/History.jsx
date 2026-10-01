import Navbar from "../components/Navbar";

function History() {
  const history = [
    {
      date: "2026-09-20",
      service: "Advising",
      outcome: "Completed",
    },
    {
      date: "2026-09-18",
      service: "Student Services",
      outcome: "Completed",
    },
    {
      date: "2026-09-15",
      service: "Technical Support",
      outcome: "Left Queue",
    },
  ];

  return (
    <div>
      <Navbar />

      <main>
        <h1>Queue History</h1>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Outcome</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{item.date}</td>
                <td>{item.service}</td>
                <td>{item.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default History;