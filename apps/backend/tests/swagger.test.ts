import { describe, expect, it } from "@jest/globals";
import express, { type Router } from "express";
import request from "supertest";
import { authenticate } from "../src/middleware/authenticate.js";
import adminRoutes from "../src/routes/admin.js";
import bookingRoutes from "../src/routes/bookings.js";
import buildingRoutes from "../src/routes/buildings.js";
import classroomRoutes from "../src/routes/classrooms.js";
import equipmentRoutes from "../src/routes/equipments.js";
import floorRoutes from "../src/routes/floors.js";
import routesAPI from "../src/routes/index.js";
import profileRoutes from "../src/routes/profile.js";
import { setupSwagger } from "../src/swagger/swagger.js";

// Les routeurs avec le préfixe sous lequel app.ts les monte
const mountedRouters: { prefix: string; router: Router }[] = [
	{ prefix: "/api", router: routesAPI },
	{ prefix: "/api", router: profileRoutes },
	{ prefix: "/api", router: buildingRoutes },
	{ prefix: "/api", router: floorRoutes },
	{ prefix: "/api", router: classroomRoutes },
	{ prefix: "/api", router: bookingRoutes },
	{ prefix: "/api", router: equipmentRoutes },
	{ prefix: "/admin", router: adminRoutes },
];

type ExpressRoute = { method: string; path: string; usesJwt: boolean };

/**
 * Liste les routes déclarées dans un routeur Express.
 *
 * @param prefix - le préfixe sous lequel le routeur est monté (ex : "/api")
 * @param router - le routeur Express
 * @returns une ligne par route : méthode, chemin au format OpenAPI, et si
 * elle est protégée par le middleware authenticate
 */
function listRoutes(prefix: string, router: Router): ExpressRoute[] {
	const routes: ExpressRoute[] = [];

	for (const layer of router.stack) {
		// Une couche sans "route" est un middleware, pas une route
		if (!layer.route) continue;

		// Express écrit les paramètres ":id", OpenAPI les écrit "{id}"
		const path = (prefix + layer.route.path).replace(/:(\w+)/g, "{$1}");

		// Chaque étape de la route (middlewares + contrôleur) connaît sa méthode HTTP
		const steps = layer.route.stack;
		const usesJwt = steps.some((step) => step.handle === authenticate);
		const methods = new Set(steps.map((step) => step.method));

		for (const method of methods) {
			routes.push({ method, path, usesJwt });
		}
	}

	return routes;
}

/**
 * Crée une petite application Express de test qui ne sert que la
 * documentation (pas besoin de base de données).
 *
 * @returns l'application Express de test
 */
function createTestApp() {
	const app = express();
	setupSwagger(app);
	return app;
}

/**
 * Récupère la spécification OpenAPI générée par swagger-jsdoc.
 *
 * @returns l'objet "paths" de la spécification
 */
async function getDocumentedPaths() {
	const response = await request(createTestApp()).get("/openapi.json");
	return response.body.paths as Record<
		string,
		Record<string, { security?: unknown }>
	>;
}

const expressRoutes = mountedRouters.flatMap(({ prefix, router }) =>
	listRoutes(prefix, router),
);

describe("Swagger", () => {
	it("should serve Swagger UI at /api/docs", async () => {
		const response = await request(createTestApp()).get("/api/docs/");

		expect(response.status).toBe(200);
		expect(response.type).toBe("text/html");
		expect(response.text).toContain("<title>API Docs - Swagger</title>");
	});

	it("should document every Express route, and only those", async () => {
		const paths = await getDocumentedPaths();

		// Même format "GET /api/me" des deux côtés pour pouvoir comparer
		const documented = Object.entries(paths).flatMap(([path, operations]) =>
			Object.keys(operations).map((method) => `${method} ${path}`),
		);
		const declared = expressRoutes.map(
			(route) => `${route.method} ${route.path}`,
		);

		expect(documented.sort()).toEqual(declared.sort());
	});

	it("should document the JWT cookie on every route protected by authenticate", async () => {
		const paths = await getDocumentedPaths();

		for (const route of expressRoutes.filter((route) => route.usesJwt)) {
			const operation = paths[route.path]?.[route.method];
			expect(operation?.security).toEqual([{ cookieAuth: [] }]);
		}
	});
});
