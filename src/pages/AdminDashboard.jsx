import Navbar from "../components/Navbar";

function AdminDashboard() {
    const services = [
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
        }
    ];

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

                        <button>
                            {service.status === "Open" ? "Close Queue" : "Open Queue"}
                        </button>
                    </section>
                ))}
            </main>
        </div>
    );
}

export default AdminDashboard;