// Tests unitaires de la page de connexion
// On vérifie les règles du mot de passe et l'affichage des erreurs du backend

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage.vue";

// vi.mock() remplace le store d'authentification par une version fictive :
// login() ne contacte pas le backend, on choisit sa réponse dans chaque test.
vi.mock("@/stores/auth", () => {
	const login = vi.fn();
	return { useAuthStore: () => ({ login }) };
});

// Même principe pour le routeur. useRoute() renvoie une adresse sans
// paramètre (pas de "?registered=1" ni de "?error=unauthorized").
vi.mock("vue-router", () => {
	const push = vi.fn();
	return {
		useRouter: () => ({ push }),
		useRoute: () => ({ query: {} }),
	};
});

// On importe les versions fictives pour contrôler et vérifier leurs appels
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

/**
 * Affiche la page de connexion, remplit le formulaire puis l'envoie.
 *
 * @param password - le mot de passe à saisir
 * @returns le composant affiché, pour vérifier ce qu'il contient
 */
async function submitForm(password: string) {
	const wrapper = mount(LoginPage, {
		// RouterLink est remplacé par une simple balise <a> (voir NavigationSidebar.test.ts)
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
	});
	await wrapper.find("#email").setValue("jean.dupont@example.com");
	await wrapper.find("#password").setValue(password);
	await wrapper.find("form").trigger("submit");
	// flushPromises() attend la fin des appels asynchrones (login, push...)
	await flushPromises();
	return wrapper;
}

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Les règles d'inscription (12 caractères minimum) ne s'appliquent pas
	// au login : un ancien compte doit toujours pouvoir se connecter.
	it("envoie la connexion même avec un mot de passe court", async () => {
		vi.mocked(authStore.login).mockResolvedValue(undefined);

		await submitForm("court");

		expect(authStore.login).toHaveBeenCalledWith(
			"jean.dupont@example.com",
			"court",
		);
		expect(router.push).toHaveBeenCalledWith("/dashboard");
	});

	it("refuse un mot de passe de plus de 128 caractères", async () => {
		const wrapper = await submitForm("a".repeat(129));

		expect(wrapper.text()).toContain(
			"Le mot de passe ne doit pas dépasser 128 caractères",
		);
		expect(authStore.login).not.toHaveBeenCalled();
	});

	it("affiche le message du backend après trop de tentatives ratées", async () => {
		vi.mocked(authStore.login).mockRejectedValue({
			message: "Too many login attempts, please try again later.",
		});

		const wrapper = await submitForm("mauvais-mot-de-passe");

		expect(wrapper.text()).toContain(
			"Too many login attempts, please try again later.",
		);
		expect(router.push).not.toHaveBeenCalled();
	});
});
