require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 4000;
const ENV = process.env.NODE_ENV || "development";

// ── Start server only AFTER database connects ──
// Think of it like: don't open the shop until
// the cash register (DB) is turned on and ready.
async function startServer() {
  try {
    await connectDB();
    console.log(`✅ MongoDB connected`);

    const server = app.listen(PORT, () => {
      console.log(`🚀 CodeArena backend running`);
      console.log(`   → Port     : ${PORT}`);
      console.log(`   → Env      : ${ENV}`);
      console.log(`   → URL      : http://localhost:${PORT}`);
    });

    // ── Graceful shutdown ──
    // When you stop the server (Ctrl+C or Render restarts it),
    // finish any requests already in progress before closing.
    // Without this, users mid-submission get a broken response.
    const shutdown = (signal) => {
      console.log(`\n⚠️  ${signal} received — shutting down gracefully`);
      server.close(() => {
        console.log("✅ All requests finished. Server closed.");
        process.exit(0);
      });

      // If it takes more than 10 seconds, force kill
      setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM")); // Render/cloud sends this
    process.on("SIGINT", () => shutdown("SIGINT"));   // Your Ctrl+C sends this

  } catch (err) {
    // If DB fails to connect, don't start the server at all.
    // A server with no DB is useless and will throw confusing errors.
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

startServer();