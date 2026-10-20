import { describe, expect, it } from "@jest/globals";
import express from "express";
import request from "supertest";
import { loginRateLimiter } from "../src/middleware/loginRateLimiter.js";

/**
 * Crée une petite application Express de test, avec une fausse route de login
 * protégée par loginRateLimiter. La fausse route répond :
 * - 200 si le mot de passe est "bon-mot-de-passe" ;
 * - 401 sinon (mauvais mot de passe).
 *
 * @returns l'application Express de test
 */
function createTestApp() {
	const app = express();
	app.use(express.json());
	app.post("/login", loginRateLimiter, (req, res) => {
		if (req.body.password === "bon-mot-de-passe") {
			res.status(200).json({ message: "User logged in successfully" });
		} else {
			res.status(401).json({ message: "Incorrect password or email address." });
		}
	});
	return app;
}

/**
 * Envoie une tentative de connexion à l'application de test.
 *
 * @param app - l'application Express de test
 * @param email - l'email saisi
 * @param password - le mot de passe saisi
 * @returns la réponse HTTP
 */
function tryLogin(app: express.Express, email: string, password: string) {
	return request(app).post("/login").send({ email, password });
}

// Le compteur est partagé entre tous les tests de ce fichier : chaque test
// utilise donc un email différent pour ne pas être gêné par les autres.
describe("loginRateLimiter", () => {
	it("should block the 11th failed attempt with a 429", async () => {
		const app = createTestApp();

		// Les 10 premiers échecs passent jusqu'au contrôleur (401)
		for (let attempt = 1; attempt <= 10; attempt++) {
			const response = await tryLogin(app, "alice@example.com", "mauvais");
			expect(response.status).toBe(401);
		}

		// Le 11e est bloqué par le middleware (429)
		const blocked = await tryLogin(app, "alice@example.com", "mauvais");
		expect(blocked.status).toBe(429);
		expect(blocked.body).toEqual({
			message: "Too many login attempts, please try again later.",
		});
	});

	it("should block even the right password once the limit is reached", async () => {
		const app = createTestApp();

		for (let attempt = 1; attempt <= 10; attempt++) {
			await tryLogin(app, "bob@example.com", "mauvais");
		}

		const response = await tryLogin(app, "bob@example.com", "bon-mot-de-passe");
		expect(response.status).toBe(429);
	});

	it("should not count successful logins", async () => {
		const app = createTestApp();

		// 15 connexions réussies : aucune n'est comptée
		for (let attempt = 1; attempt <= 15; attempt++) {
			const response = await tryLogin(
				app,
				"chloe@example.com",
				"bon-mot-de-passe",
			);
			expect(response.status).toBe(200);
		}

		// Un échec arrive donc toujours jusqu'au contrôleur
		const response = await tryLogin(app, "chloe@example.com", "mauvais");
		expect(response.status).toBe(401);
	});

	it("should count attempts separately for each email", async () => {
		const app = createTestApp();

		for (let attempt = 1; attempt <= 10; attempt++) {
			await tryLogin(app, "david@example.com", "mauvais");
		}

		// david est bloqué, mais pas emma (même IP, autre email)
		const david = await tryLogin(app, "david@example.com", "mauvais");
		const emma = await tryLogin(app, "emma@example.com", "mauvais");
		expect(david.status).toBe(429);
		expect(emma.status).toBe(401);
	});

	// Changer les majuscules de l'email ne doit pas donner un nouveau compteur
	it("should ignore the case of the email", async () => {
		const app = createTestApp();

		for (let attempt = 1; attempt <= 10; attempt++) {
			await tryLogin(app, "Farid@Example.com", "mauvais");
		}

		const response = await tryLogin(app, "farid@example.com", "mauvais");
		expect(response.status).toBe(429);
	});
});
