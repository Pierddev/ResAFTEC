// Tests unitaires de la page d'inscription
// On vérifie les règles du mot de passe et l'affichage des erreurs du backend

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage.vue";

// vi.mock() remplace le store d'authentification par une version fictive :
// register() ne contacte pas le backend, on choisit sa réponse dans chaque test.
vi.mock("@/stores/auth", () => {
	const register = vi.fn();
	return { useAuthStore: () => ({ register }) };
});

// Même principe pour le routeur : push() ne change pas vraiment de page.
vi.mock("vue-router", () => {
	const push = vi.fn();
	return { useRouter: () => ({ push }) };
});

// On importe les versions fictives pour contrôler et vérifier leurs appels
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

/**
 * Affiche la page d'inscription, remplit le formulaire puis l'envoie.
 *
 * @param password - le mot de passe à saisir (dans les deux champs)
 * @returns le composant affiché, pour vérifier ce qu'il contient
 */
async function submitForm(password: string) {
	const wrapper = mount(RegisterPage, {
		// RouterLink est remplacé par une simple balise <a> (voir NavigationSidebar.test.ts)
		global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
	});
	await wrapper.find("#firstname").setValue("Jean");
	await wrapper.find("#lastname").setValue("Dupont");
	await wrapper.find("#email").setValue("jean.dupont@example.com");
	await wrapper.find("#password").setValue(password);
	await wrapper.find("#confirmPassword").setValue(password);
	await wrapper.find("form").trigger("submit");
	// flushPromises() attend la fin des appels asynchrones (register, push...)
	await flushPromises();
	return wrapper;
}

describe("RegisterPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("affiche les règles du mot de passe sous le champ", () => {
		const wrapper = mount(RegisterPage, {
			global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
		});
		expect(wrapper.find("#password-rules").text()).toContain(
			"Entre 12 et 128 caractères",
		);
	});

	it("refuse un mot de passe de 11 caractères", async () => {
		const wrapper = await submitForm("b204-reserv");

		expect(wrapper.text()).toContain(
			"Le mot de passe doit contenir au moins 12 caractères",
		);
		expect(authStore.register).not.toHaveBeenCalled();
	});

	it("refuse un mot de passe de plus de 128 caractères", async () => {
		const wrapper = await submitForm("a".repeat(129));

		expect(wrapper.text()).toContain(
			"Le mot de passe ne doit pas dépasser 128 caractères",
		);
		expect(authStore.register).not.toHaveBeenCalled();
	});

	it("envoie l'inscription avec un mot de passe de 12 caractères", async () => {
		vi.mocked(authStore.register).mockResolvedValue({});

		await submitForm("b204-reserve");

		expect(authStore.register).toHaveBeenCalledWith({
			firstname: "Jean",
			lastname: "Dupont",
			email: "jean.dupont@example.com",
			password: "b204-reserve",
		});
		expect(router.push).toHaveBeenCalledWith("/login?registered=1");
	});

	it("affiche la règle précise renvoyée par le backend", async () => {
		// Réponse du backend pour un mot de passe de la liste des plus courants
		vi.mocked(authStore.register).mockRejectedValue({
			message: "Failed to validate request",
			error: [
				{ message: "Ce mot de passe est trop courant, choisissez-en un autre" },
			],
		});

		const wrapper = await submitForm("azertyuiop123");

		expect(wrapper.text()).toContain(
			"Ce mot de passe est trop courant, choisissez-en un autre",
		);
		expect(wrapper.text()).not.toContain("Failed to validate request");
	});

	it("affiche le message général quand le backend ne donne pas de détail", async () => {
		vi.mocked(authStore.register).mockRejectedValue({
			message: "User already exists",
		});

		const wrapper = await submitForm("reservation-salle-b204");

		expect(wrapper.text()).toContain("User already exists");
	});
});
