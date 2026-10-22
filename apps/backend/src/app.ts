import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { AppDataSource } from "./database/data-source.js";
import adminRoutes from "./routes/admin.js";
import bookingRoutes from "./routes/bookings.js";
import buildingRoutes from "./routes/buildings.js";
import classroomRoutes from "./routes/classrooms.js";
import equipmentRoutes from "./routes/equipments.js";
import floorRoutes from "./routes/floors.js";
import routesAPI from "./routes/index.js";
import profileRoutes from "./routes/profile.js";
import { setupSwagger } from "./swagger/swagger.js";

const app = express();
const port = env.port;

app.use(
	cors({
		origin: env.urlSite,
		credentials: true,
	}),
);

app.use(cookieParser());
app.use(express.json());

// Swagger
setupSwagger(app);

app.use("/api", routesAPI);

// Mount protected routes (JWT authentication required)
// GET /api/me restores the user session on the frontend after a page refresh
app.use("/api", profileRoutes);
app.use("/api", buildingRoutes);
app.use("/api", floorRoutes);
app.use("/api", classroomRoutes);
app.use("/api", bookingRoutes);
app.use("/api", equipmentRoutes);
app.use("/admin", adminRoutes);

// BDD connexion and server start
AppDataSource.initialize()
	.then(() => {
		console.log("Connexion à la BDD réussie");
		app.listen(port, () => {
			console.log(`Serveur démarré sur http://localhost:${port}`);
		});
	})
	.catch((error) => {
		console.error("Erreur lors de la connexion à la BDD :", error);
	});
