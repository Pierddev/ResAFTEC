import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

// Clé secrète des tokens de test. Elle est définie AVANT d'importer les routes :
// config/env.ts lit process.env.JWT_SECRET au moment où il est importé.
const TEST_SECRET = "cle-secrete-de-test";
process.env.JWT_SECRET = TEST_SECRET;

const mockGetAll = jest.fn<() => Promise<unknown>>();

// On remplace le service : la route est testée sans base de données
jest.unstable_mockModule("../src/services/userService.js", () => ({
	UserService: jest.fn().mockImplementation(() => ({ getAll: mockGetAll })),
}));

// Les routes sont importées APRÈS le mock et la clé secrète
const { default: adminRoutes } = await import("../src/routes/admin.js");

/**
 * Crée une petite application Express de test qui monte les routes
 * d'administration comme app.ts (préfixe /admin, cookies lus par cookieParser).
 *
 * @returns l'application Express de test
 */
function createTestApp() {
	const app = express();
	app.use(cookieParser());
	app.use("/admin", adminRoutes);
	return app;
}

/**
 * Appelle GET /admin/users avec le token d'une personne connectée.
 *
 * @param role - le rôle rangé dans le token, ex. : "student"
 * @returns la réponse HTTP
 */
function getUsersAs(role: string) {
	// Même contenu que le token créé à la connexion : l'id et le rôle
	const token = jwt.sign({ userId: "2", role: role }, TEST_SECRET);
	return request(createTestApp())
		.get("/admin/users")
		.set("Cookie", `token=${token}`);
}

describe("GET /admin/users", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should return 401 without a token", async () => {
		const response = await request(createTestApp()).get("/admin/users");

		expect(response.status).toBe(401);
		expect(mockGetAll).not.toHaveBeenCalled();
	});

	it("should return 403 to a student, without reading the users", async () => {
		const response = await getUsersAs("student");

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: "Accès refusé" });
		// La liste n'est même pas lue en base
		expect(mockGetAll).not.toHaveBeenCalled();
	});

	it("should return 403 to a teacher", async () => {
		const response = await getUsersAs("teacher");

		expect(response.status).toBe(403);
		expect(mockGetAll).not.toHaveBeenCalled();
	});

	it("should return every user to an admin", async () => {
		const users = [
			{
				id: 1,
				firstname: "Jean",
				lastname: "Dupont",
				email: "jean@example.com",
			},
		];
		mockGetAll.mockResolvedValue(users);

		const response = await getUsersAs("admin");

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ users: users });
	});
});
