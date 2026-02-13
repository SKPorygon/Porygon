import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import profilesRoutes from "./routes/profiles";
import servicesRoutes from "./routes/services"

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use(cors({
    origin: "http://localhost:5173",
  }));

app.use("/api/profiles", profilesRoutes);
app.use("/api/services", servicesRoutes);

export default app;
