import errorLogger from "#config/logger.js";
import errorHandler from "#middleware/errorHandler.js";
import routes from "#routes/index.js";
import cors from "cors";
import express from "express";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(errorLogger);
app.use("/", routes);
app.use(errorHandler);

export default app;
