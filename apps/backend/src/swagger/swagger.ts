// src/swagger.ts

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express, Request, Response } from "express";
import redoc from "redoc-express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Dossier src/, calculé à partir de l'emplacement de ce fichier (src/swagger/)
// et non du dossier de lancement : la doc se génère aussi quand les tests
// sont lancés depuis la racine du dépôt
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Configuration de Swagger
const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "API - Réservation de salle",
			version: "1.0.0",
			description: "Réservation de salle AFTEC",
		},
		// URL relative : "Try it out" appelle le serveur qui affiche la doc,
		// quel que soit le port choisi dans le .env
		servers: [{ url: "/", description: "Serveur courant" }],
		components: {
			securitySchemes: {
				// Le JWT n'est pas envoyé dans l'en-tête Authorization :
				// il est stocké dans le cookie HttpOnly "token" (voir authenticate.ts)
				cookieAuth: {
					type: "apiKey",
					in: "cookie",
					name: "token",
					description:
						"Token JWT stocké dans le cookie HttpOnly `token`, créé par `POST /api/login`. Dans Swagger UI, appelez d'abord `/api/login` avec « Try it out » : le navigateur garde le cookie et l'envoie ensuite tout seul aux autres routes.",
				},
				// Identifiant et mot de passe envoyés dans l'en-tête Authorization
				// (voir basicAuth.ts)
				basicAuth: {
					type: "http",
					scheme: "basic",
				},
			},
		},
	},
	apis: [
		path.resolve(srcDir, "routes/*.ts").replace(/\\/g, "/"),
		path.resolve(srcDir, "entity/*.ts").replace(/\\/g, "/"),
	],
};

const specs = swaggerJsdoc(options);

// Écrit le fichier openapi.json
fs.writeFileSync(
	path.resolve(srcDir, "openapi.json"),
	JSON.stringify(specs, null, 2),
);

export const setupSwagger = (app: Express) => {
	// Route pour Swagger UI : documentation interactive (bouton "Try it out")
	app.use(
		"/api/docs",
		swaggerUi.serve,
		swaggerUi.setup(specs, { customSiteTitle: "API Docs - Swagger" }),
	);

	// Route pour Redoc
	// Utilisation de redoc-express avec transtypage pour contourner les limitations nodenext
	const redocMiddleware = redoc as unknown as (
		options: Record<string, unknown>,
	) => (req: Request, res: Response) => void;
	app.get(
		"/docs",
		redocMiddleware({
			title: "API Docs - Redoc",
			specUrl: "/openapi.json",
			redocOptions: {
				theme: {
					colors: {
						primary: {
							main: "#1976d2",
						},
					},
					typography: {
						fontSize: "15px",
						fontFamily: '"Inter", sans-serif',
					},
				},
			},
		}),
	);

	// Servir le fichier openapi.json
	app.get("/openapi.json", (_req: Request, res: Response) => {
		res.setHeader("Content-Type", "application/json");
		res.send(specs);
	});
};
