import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Attach Socket.IO
export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://storza-client.vercel.app"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ✅ Connect DB and start server
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("MongoDB Connected");

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB Connection Error:", err);
  });
