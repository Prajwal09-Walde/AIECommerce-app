const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

console.log("Starting Next.js app preparation...");

app.prepare().then(() => {
  console.log("Next.js prepared successfully");
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Disable zlib-based compression to prevent Node.js memory allocation crashes on socket streams
    perMessageDeflate: false,
    httpCompression: false,
  });

  // Mock real-time orders interval
  let mockOrderInterval;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send a new mock order every 5 seconds
    mockOrderInterval = setInterval(() => {
      const newOrder = {
        id: `ORD-${Math.floor(Math.random() * 100000)}`,
        customer: `Customer ${Math.floor(Math.random() * 100)}`,
        amount: (Math.random() * 500 + 50).toFixed(2),
        status: ["Pending", "Processing", "Shipped"][Math.floor(Math.random() * 3)],
        time: new Date().toLocaleTimeString(),
      };
      socket.emit("new-order", newOrder);
    }, 5000);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      clearInterval(mockOrderInterval);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to prepare Next.js:", err);
  process.exit(1);
});
