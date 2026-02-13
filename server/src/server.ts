import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import profilesRoutes from "./routes/profiles";
import createServicesRouter from "./routes/services";
import authRoutes from "./routes/auth";
import logsRoutes from "./routes/logs";
import http from "http";
import connectDB from "./config/db";
import WebSocketManager from "./websockets/websocketServer";
import testingProfilesRoutes from "./routes/testingProfilesRoutes";

const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const server = http.createServer(app);

const websocketManager = new WebSocketManager(server);

let monitoredNamespaces = new Set<string>();

app.get("/", (req, res) => {
  res.send("WebSocket server is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profilesRoutes(websocketManager, monitoredNamespaces));
app.use("/api/services", createServicesRouter(websocketManager));
app.use("/api/testing-profiles", testingProfilesRoutes);
app.use("/api/logs", logsRoutes);

connectDB();

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
