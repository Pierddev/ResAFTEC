// Tests unitaires du garde de navigation (authGuard)
// On vérifie qu'un visiteur non connecté ne peut pas ouvrir les pages protégées

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalized } from "vue-router";

// vi.mock() remplace le store d'authentification par une version fictive :
// dans chaque test, on choisit nous-mêmes si l'utilisateur est connecté.
vi.mock("@/stores/auth", () => {
	const store = { isAuthenticated: false, fetchUser: vi.fn() };
	return { useAuthStore: () => store };
});

// On importe la version fictive du store pour la modifier dans les tests
import { useAuthStore } from "@/stores/auth";
import { authGuard } from "./index";

const authStore = useAuthStore();

/**
 * Crée une fausse route qui ne contient que son nom :
 * c'est la seule information lue par le garde.
 *
 * @param name - le nom de la route, par exemple "Dashboard"
 * @returns la route à donner à authGuard
 */
function routeNamed(name: string) {
	return { name } as RouteLocationNormalized;
}

describe("authGuard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Au début de chaque test, personne n'est connecté
		authStore.isAuthenticated = false;
	});

	it("redirige vers la page de connexion un visiteur non connecté", async () => {
		const result = await authGuard(routeNamed("Dashboard"));

		expect(result).toEqual({ name: "Login", query: { error: "unauthorized" } });
	});

	it("laisse un visiteur non connecté ouvrir les pages publiques", async () => {
		expect(await authGuard(routeNamed("Home"))).toBe(true);
		expect(await authGuard(routeNamed("Login"))).toBe(true);
		expect(await authGuard(routeNamed("Register"))).toBe(true);
	});

	it("laisse un utilisateur connecté ouvrir les pages protégées", async () => {
		authStore.isAuthenticated = true;

		const result = await authGuard(routeNamed("Booking"));

		expect(result).toBe(true);
	});

	it("renvoie un utilisateur connecté des pages publiques vers le tableau de bord", async () => {
		authStore.isAuthenticated = true;

		const result = await authGuard(routeNamed("Login"));

		expect(result).toEqual({ name: "Dashboard" });
	});

	// Après un rafraîchissement de la page (F5), le store est vide : le garde
	// essaie de restaurer la session avec le cookie (appel GET /api/me)
	it("restaure la session avec fetchUser si le cookie est encore valide", async () => {
		// mockImplementationOnce() : seulement pour ce test, fetchUser
		// fait comme si le backend avait accepté le cookie
		vi.mocked(authStore.fetchUser).mockImplementationOnce(async () => {
			authStore.isAuthenticated = true;
		});

		const result = await authGuard(routeNamed("Dashboard"));

		expect(authStore.fetchUser).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it("n'appelle pas fetchUser si l'utilisateur est déjà connecté", async () => {
		authStore.isAuthenticated = true;

		await authGuard(routeNamed("Dashboard"));

		expect(authStore.fetchUser).not.toHaveBeenCalled();
	});
});
