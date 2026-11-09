// Tests unitaires du composant ReplacementClassroomsForm
// On vérifie la recherche des salles de remplacement pour chaque date en échec,
// et ce qui est affiché selon la réponse du backend

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	BookingSeriesReport,
	ReplacementClassroom,
} from "@/services/bookingSeriesService";
import ReplacementClassroomsForm from "./ReplacementClassroomsForm.vue";

// getReplacementClassrooms() ne contacte pas le backend :
// on choisit sa réponse dans chaque test
vi.mock("@/services/bookingSeriesService", () => ({
	bookingSeriesService: { getReplacementClassrooms: vi.fn() },
}));

// On importe la version fictive pour contrôler et vérifier ses appels
import { bookingSeriesService } from "@/services/bookingSeriesService";

const getReplacementClassrooms = vi.mocked(
	bookingSeriesService.getReplacementClassrooms,
);

// Salles de remplacement (fictives)
const a201: ReplacementClassroom = {
	id: 6,
	name: "A201",
	capacity: 30,
	floor: { id: 2, level: 2, building: { id: 1, name: "Bâtiment A" } },
};
const b101: ReplacementClassroom = {
	id: 8,
	name: "B101",
	capacity: 35,
	floor: { id: 3, level: 1, building: { id: 2, name: "Bâtiment B" } },
};

// Rapport de série : deux mardis en échec, à 10h à Paris (08:00 UTC en été)
const report: BookingSeriesReport = {
	series: { id: 1, title: "Cours de TypeScript" },
	booked: [],
	failed: [
		{ date: "2027-03-30T08:00:00.000Z", reason: "already_booked" },
		{ date: "2027-04-06T08:00:00.000Z", reason: "disabled" },
	],
};

/**
 * Affiche le composant avec le rapport, puis attend la fin de la recherche des salles.
 *
 * @returns le composant affiché, pour vérifier ce qu'il contient
 */
async function mountForm() {
	const wrapper = mount(ReplacementClassroomsForm, { props: { report } });
	await flushPromises();
	return wrapper;
}

/**
 * Donne le texte de chaque option d'une liste de salles.
 *
 * @param wrapper - le composant affiché par mountForm
 * @param selector - la liste, ex. : "#replacement_0" pour la première date
 * @returns le texte des options, dans l'ordre de la liste
 */
function getOptionTexts(
	wrapper: Awaited<ReturnType<typeof mountForm>>,
	selector: string,
): string[] {
	return wrapper.findAll(`${selector} option`).map((option) => option.text());
}

describe("ReplacementClassroomsForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("cherche les salles de remplacement de chaque date, avec la date de Paris", async () => {
		getReplacementClassrooms.mockResolvedValue([]);

		await mountForm();

		// Une demande par date en échec : l'id de la série, puis la date "AAAA-MM-JJ"
		expect(getReplacementClassrooms).toHaveBeenCalledTimes(2);
		expect(getReplacementClassrooms).toHaveBeenCalledWith(1, "2027-03-30");
		expect(getReplacementClassrooms).toHaveBeenCalledWith(1, "2027-04-06");
	});

	it("affiche chaque date en échec avec son motif", async () => {
		getReplacementClassrooms.mockResolvedValue([]);

		const wrapper = await mountForm();

		const text = wrapper.text();
		expect(text).toContain("Dates non réservées : 2");
		expect(text).toContain("mardi 30/03/2027 : déjà réservée");
		expect(text).toContain("mardi 06/04/2027 : salle désactivée");
	});

	it("affiche un message pendant la recherche des salles", async () => {
		// Une promesse qui ne se termine jamais : la recherche reste en cours
		getReplacementClassrooms.mockReturnValue(new Promise(() => {}));

		const wrapper = await mountForm();

		expect(wrapper.text()).toContain("Recherche des salles de remplacement...");
		expect(wrapper.find("select").exists()).toBe(false);
	});

	it("propose les salles libres de chaque date, sans en choisir une au départ", async () => {
		// mockResolvedValueOnce : une réponse différente pour chaque appel, dans l'ordre
		getReplacementClassrooms
			.mockResolvedValueOnce([a201, b101])
			.mockResolvedValueOnce([b101]);

		const wrapper = await mountForm();

		expect(getOptionTexts(wrapper, "#replacement_0")).toEqual([
			"Ne pas réserver cette date",
			"A201 – 30 places, Bâtiment A, étage 2",
			"B101 – 35 places, Bâtiment B, étage 1",
		]);
		expect(getOptionTexts(wrapper, "#replacement_1")).toEqual([
			"Ne pas réserver cette date",
			"B101 – 35 places, Bâtiment B, étage 1",
		]);
		// option:checked = l'option sélectionnée dans la liste
		expect(wrapper.find("#replacement_0 option:checked").text()).toBe(
			"Ne pas réserver cette date",
		);
	});

	it("indique quand aucune salle n'est libre ce jour-là", async () => {
		getReplacementClassrooms
			.mockResolvedValueOnce([a201])
			.mockResolvedValueOnce([]);

		const wrapper = await mountForm();

		// Une liste pour la première date, un message pour la deuxième
		expect(wrapper.find("#replacement_0").exists()).toBe(true);
		expect(wrapper.find("#replacement_1").exists()).toBe(false);
		expect(wrapper.text()).toContain("Aucune salle libre sur ce créneau");
	});

	it("affiche le message du backend pour une date, et cherche quand même les autres", async () => {
		getReplacementClassrooms
			.mockRejectedValueOnce({ message: "Cette occurrence a déjà commencé" })
			.mockResolvedValueOnce([b101]);

		const wrapper = await mountForm();

		expect(wrapper.text()).toContain("Cette occurrence a déjà commencé");
		expect(wrapper.find("#replacement_0").exists()).toBe(false);
		expect(wrapper.find("#replacement_1").exists()).toBe(true);
	});
});
