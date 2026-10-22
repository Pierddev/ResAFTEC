// Tests unitaires de la gestion des erreurs de l'API (handleApiError)
// On vérifie surtout la redirection vers la page de connexion quand la session expire

import type { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "./apiService";

/**
 * Crée une fausse erreur axios, comme si le backend avait répondu
 * avec un code d'erreur.
 *
 * @param status - le code HTTP renvoyé par le backend (ex. 401)
 * @param url - l'adresse appelée (ex. "/me")
 * @returns l'erreur à donner à handleApiError
 */
function fakeResponseError(status: number, url: string) {
	return {
		response: { status, data: { message: "jwt expired" } },
		config: { url },
	} as unknown as AxiosError;
}

describe("handleApiError", () => {
	beforeEach(() => {
		// Dans les tests, on ne peut pas vraiment changer de page :
		// vi.stubGlobal() remplace window.location par un simple objet
		// dont on peut lire la propriété href
		vi.stubGlobal("location", { href: "/dashboard" });
	});

	afterEach(() => {
		// On remet le vrai window.location après chaque test
		vi.unstubAllGlobals();
	});

	it("redirige vers la page de connexion si la session a expiré (401)", async () => {
		const error = fakeResponseError(401, "/get-building");

		// .rejects vérifie que la promesse est bien rejetée avec le message du backend
		await expect(handleApiError(error)).rejects.toEqual({
			message: "jwt expired",
		});
		expect(window.location.href).toBe("/login?error=unauthorized");
	});

	it("ne redirige pas si le mot de passe est faux (401 sur /login)", async () => {
		const error = fakeResponseError(401, "/login");

		await expect(handleApiError(error)).rejects.toEqual({
			message: "jwt expired",
		});
		expect(window.location.href).toBe("/dashboard");
	});

	it("ne redirige pas quand le garde vérifie la session (401 sur /me)", async () => {
		const error = fakeResponseError(401, "/me");

		await expect(handleApiError(error)).rejects.toEqual({
			message: "jwt expired",
		});
		expect(window.location.href).toBe("/dashboard");
	});

	it("ne redirige pas pour une autre erreur (400)", async () => {
		const error = fakeResponseError(400, "/create-booking");

		await expect(handleApiError(error)).rejects.toEqual({
			message: "jwt expired",
		});
		expect(window.location.href).toBe("/dashboard");
	});

	it("renvoie un message clair si le backend ne répond pas", async () => {
		// Pas de "response" mais une "request" : la requête est partie
		// mais le serveur n'a jamais répondu
		const error = { request: {} } as unknown as AxiosError;

		await expect(handleApiError(error)).rejects.toEqual({
			message: "API is unreachable (server down or CORS)",
		});
	});
});
