// Tests unitaires de la page de réservation
// On vérifie le formulaire de série (champs affichés, dates envoyées au backend, erreurs)
// et le rapport de série affiché après la réponse du backend

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/stores/auth";
import BookingPage from "./BookingPage.vue";

// vi.mock() remplace les modules par des versions fictives : aucun appel au backend.
// Toutes les requêtes GET reçoivent la même réponse : la page y lit
// "buildings" pour la liste des bâtiments et "floors" pour la liste des étages.
vi.mock("@/services/apiService", () => ({
	default: {
		get: vi.fn().mockResolvedValue({
			data: {
				buildings: [{ id: 1, name: "Bâtiment A" }],
				floors: [{ id: 1, level: 1 }],
			},
		}),
	},
}));

// L'id de la salle est en texte ("4"), comme dans la vraie réponse de l'API (voir #217)
vi.mock("@/services/classroomService", () => ({
	classroomService: {
		getByFloor: vi
			.fn()
			.mockResolvedValue([{ id: "4", name: "C101", capacity: 20 }]),
	},
}));

// create() ne contacte pas le backend : on choisit sa réponse dans chaque test.
// getReplacementClassrooms() est appelée par le composant des dates en échec :
// ici, aucune salle de remplacement n'est libre (voir ReplacementClassroomsForm.test.ts).
vi.mock("@/services/bookingSeriesService", () => ({
	bookingSeriesService: {
		create: vi.fn(),
		getReplacementClassrooms: vi.fn().mockResolvedValue([]),
	},
}));

// Le store renvoie toujours le même objet : chaque test choisit la personne connectée
vi.mock("@/stores/auth", () => {
	const store = { user: null };
	return { useAuthStore: () => store };
});

// On importe les versions fictives pour contrôler et vérifier leurs appels
import { bookingSeriesService } from "@/services/bookingSeriesService";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

// Personne connectée avec le rôle formateur
const teacher: User = {
	id: 2,
	firstname: "Jean",
	lastname: "Dupont",
	email: "jean.dupont@example.com",
	role: 2,
	roleName: "teacher",
};

/**
 * Affiche la page, choisit la salle C101 dans les filtres,
 * puis remplit le formulaire : chaque mardi de 10h à 12h, entre deux semaines.
 *
 * @param startWeek - le numéro de la semaine de début
 * @param endWeek - le numéro de la semaine de fin
 * @param year - l'année des deux semaines (2027 si on ne la précise pas)
 * @returns le composant affiché, pour l'envoyer et vérifier ce qu'il contient
 */
async function mountAndFillForm(
	startWeek: number,
	endWeek: number,
	year = 2027,
) {
	const wrapper = mount(BookingPage);

	// Filtres : bâtiment, puis étage, puis salle.
	// flushPromises() attend la fin du chargement de la liste suivante.
	await flushPromises();
	await wrapper.find("#building").setValue(1);
	await flushPromises();
	await wrapper.find("#floor").setValue(1);
	await flushPromises();
	await wrapper.find("#classroom").setValue(4);

	// Formulaire de la série
	await wrapper.find("#title").setValue("Cours de TypeScript");
	await wrapper.find("#is_weekly").setValue(true);
	await wrapper.find("#day_of_week").setValue(2);
	await wrapper.find("#start_time").setValue("10:00");
	await wrapper.find("#end_time").setValue("12:00");
	// L'année d'abord, comme un utilisateur qui prépare une série l'an prochain
	await wrapper.find("#start_year").setValue(year);
	await wrapper.find("#start_week").setValue(startWeek);
	await wrapper.find("#end_year").setValue(year);
	await wrapper.find("#end_week").setValue(endWeek);

	return wrapper;
}

/**
 * Envoie le formulaire et attend la réponse (fictive) du backend.
 *
 * @param wrapper - le composant affiché par mountAndFillForm
 */
async function submitForm(
	wrapper: Awaited<ReturnType<typeof mountAndFillForm>>,
) {
	await wrapper.find("form").trigger("submit");
	await flushPromises();
}

/**
 * Affiche la page, coche « Répéter chaque semaine », puis modifie un champ
 * comme un clic sur + ou − : setValue() déclenche les événements "input"
 * et "change", comme le navigateur.
 *
 * @param selector - le champ à modifier, ex. : "#start_week"
 * @param value - la nouvelle valeur du champ
 * @returns le composant affiché, pour vérifier les semaines corrigées
 */
async function mountAndChangeField(selector: string, value: number) {
	const wrapper = mount(BookingPage);
	await wrapper.find("#is_weekly").setValue(true);
	await wrapper.find(selector).setValue(value);
	return wrapper;
}

describe("BookingPage - formulaire de série", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authStore.user = teacher;

		// On fixe la date du jour au lundi 9 novembre 2026 (semaine 46) :
		// les tests donnent le même résultat quel que soit le jour où on les lance.
		// toFake: ["Date"] : seule la date est simulée, les promesses fonctionnent normalement.
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-09T10:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("cache le formulaire de réservation à un étudiant", () => {
		authStore.user = { ...teacher, roleName: "student" };

		const wrapper = mount(BookingPage);

		expect(wrapper.find("form").exists()).toBe(false);
	});

	it("affiche les champs de la série quand on coche « Répéter chaque semaine »", async () => {
		const wrapper = mount(BookingPage);
		expect(wrapper.find("#day_of_week").exists()).toBe(false);

		await wrapper.find("#is_weekly").setValue(true);

		expect(wrapper.find("#day_of_week").exists()).toBe(true);
		expect(wrapper.find("#start_week").exists()).toBe(true);
		expect(wrapper.find("#end_week").exists()).toBe(true);
	});

	it("remplit les semaines de début et de fin avec la semaine actuelle", async () => {
		const wrapper = mount(BookingPage);
		await wrapper.find("#is_weekly").setValue(true);

		expect(wrapper.find("#start_week_dates").text()).toBe(
			"S46-2026 : du 09/11 au 15/11",
		);
		expect(wrapper.find("#end_week_dates").text()).toBe(
			"S46-2026 : du 09/11 au 15/11",
		);
	});

	it("fait rattraper la semaine de début par la semaine de fin", async () => {
		const wrapper = await mountAndChangeField("#start_week", 50);

		expect(wrapper.find("#end_week_dates").text()).toBe(
			"S50-2026 : du 07/12 au 13/12",
		);
	});

	it("passe à l'année suivante après la dernière semaine de l'année", async () => {
		// 2026 a 53 semaines : + sur la semaine 53 donne 54
		const wrapper = await mountAndChangeField("#end_week", 54);

		expect(wrapper.find("#end_week_dates").text()).toBe(
			"S1-2027 : du 04/01 au 10/01",
		);
	});

	it("empêche le − de descendre sous la semaine actuelle, seulement cette année", async () => {
		const wrapper = mount(BookingPage);
		await wrapper.find("#is_weekly").setValue(true);

		// En 2026, la semaine de début ne peut pas descendre sous la semaine 46
		expect(wrapper.find("#start_week").attributes("min")).toBe("46");

		// En 2027, pas de minimum : le − peut revenir à la dernière semaine de 2026
		await wrapper.find("#start_year").setValue(2027);
		expect(wrapper.find("#start_week").attributes("min")).toBeUndefined();
	});

	it("refuse une semaine de début déjà passée tapée au clavier", async () => {
		// Semaine 45 de 2026 : la semaine dernière
		const wrapper = await mountAndFillForm(45, 46, 2026);
		await submitForm(wrapper);

		expect(wrapper.text()).toContain("La semaine de début est déjà passée");
		expect(bookingSeriesService.create).not.toHaveBeenCalled();
	});

	it("ne propose pas le dimanche à un formateur", async () => {
		const wrapper = mount(BookingPage);
		await wrapper.find("#is_weekly").setValue(true);

		// Texte de chaque option de la liste des jours
		const days = wrapper
			.findAll("#day_of_week option")
			.map((option) => option.text());

		expect(days).toContain("Samedi");
		expect(days).not.toContain("Dimanche");
	});

	it("propose le dimanche à un administrateur", async () => {
		authStore.user = { ...teacher, roleName: "admin" };
		const wrapper = mount(BookingPage);
		await wrapper.find("#is_weekly").setValue(true);

		const days = wrapper
			.findAll("#day_of_week option")
			.map((option) => option.text());

		expect(days).toContain("Dimanche");
	});

	it("propose les heures de 07:00 à 22:00 au format 24 heures", async () => {
		const wrapper = mount(BookingPage);
		await wrapper.find("#is_weekly").setValue(true);

		// slice(1) enlève la première option "Choisir", qui n'est pas une heure
		const times = wrapper
			.findAll("#start_time option")
			.map((option) => option.text())
			.slice(1);

		expect(times[0]).toBe("07:00");
		expect(times[1]).toBe("07:15");
		expect(times).toContain("13:30");
		expect(times[times.length - 1]).toBe("22:00");
		// De 07:00 à 22:00 : 15 heures × 4 quarts d'heure + 22:00 = 61 heures
		expect(times).toHaveLength(61);
	});

	it("affiche le lundi et le dimanche de chaque semaine choisie", async () => {
		const wrapper = await mountAndFillForm(12, 20);

		expect(wrapper.find("#start_week_dates").text()).toBe(
			"S12-2027 : du 22/03 au 28/03",
		);
		expect(wrapper.find("#end_week_dates").text()).toBe(
			"S20-2027 : du 17/05 au 23/05",
		);
	});

	it("envoie le lundi de la semaine de début et le dimanche de la semaine de fin", async () => {
		vi.mocked(bookingSeriesService.create).mockResolvedValue({
			series: { id: 1, title: "Cours de TypeScript" },
			booked: [],
			failed: [],
		});

		const wrapper = await mountAndFillForm(12, 20);
		await submitForm(wrapper);

		expect(bookingSeriesService.create).toHaveBeenCalledWith({
			title: "Cours de TypeScript",
			classroomId: 4,
			reservedForUserId: 2,
			dayOfWeek: 2,
			startTime: "10:00",
			endTime: "12:00",
			startDate: "2027-03-22",
			endDate: "2027-05-23",
		});
	});

	it("envoie l'id de la salle en nombre, même si l'API le donne en texte", async () => {
		vi.mocked(bookingSeriesService.create).mockResolvedValue({
			series: { id: 1, title: "Cours de TypeScript" },
			booked: [],
			failed: [],
		});

		const wrapper = await mountAndFillForm(12, 20);
		await submitForm(wrapper);

		// La liste des salles contient l'id "4" (texte) : le backend attend 4 (nombre).
		// expect.objectContaining() vérifie seulement les champs qu'on lui donne.
		expect(bookingSeriesService.create).toHaveBeenCalledWith(
			expect.objectContaining({ classroomId: 4 }),
		);
	});

	it("refuse une semaine de fin avant la semaine de début", async () => {
		const wrapper = await mountAndFillForm(20, 12);
		await submitForm(wrapper);

		expect(wrapper.text()).toContain(
			"La semaine de fin doit être après la semaine de début",
		);
		expect(bookingSeriesService.create).not.toHaveBeenCalled();
	});

	it("affiche le message du backend s'il refuse la série", async () => {
		vi.mocked(bookingSeriesService.create).mockRejectedValue({
			message: "Une série ne peut pas dépasser 52 semaines",
		});

		const wrapper = await mountAndFillForm(12, 20);
		await submitForm(wrapper);

		expect(wrapper.text()).toContain(
			"Une série ne peut pas dépasser 52 semaines",
		);
	});
});

describe("BookingPage - rapport de série", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authStore.user = teacher;
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-09T10:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Crée une réservation obtenue (fictive) pour le rapport.
	 *
	 * @param id - l'id de la réservation
	 * @returns la réservation, avec des dates sans importance pour l'affichage
	 */
	function bookedOccurrence(id: number) {
		return {
			id,
			start_at: "2027-03-23T09:00:00.000Z",
			end_at: "2027-03-23T11:00:00.000Z",
		};
	}

	it("affiche une confirmation globale quand toutes les dates sont réservées", async () => {
		vi.mocked(bookingSeriesService.create).mockResolvedValue({
			series: { id: 1, title: "Cours de TypeScript" },
			booked: [
				bookedOccurrence(51),
				bookedOccurrence(52),
				bookedOccurrence(53),
			],
			failed: [],
		});

		const wrapper = await mountAndFillForm(12, 14);
		await submitForm(wrapper);

		expect(wrapper.find("#series_report").text()).toBe(
			"Toutes les dates de la série sont réservées (3).",
		);
	});

	it("affiche chaque date en échec avec son motif, à l'heure de Paris", async () => {
		vi.mocked(bookingSeriesService.create).mockResolvedValue({
			series: { id: 1, title: "Cours de TypeScript" },
			booked: [bookedOccurrence(51)],
			failed: [
				// 08:00 UTC = 10h à Paris (heure d'été)
				{ date: "2027-03-30T08:00:00.000Z", reason: "already_booked" },
				{ date: "2027-04-06T08:00:00.000Z", reason: "disabled" },
			],
		});

		const wrapper = await mountAndFillForm(12, 14);
		await submitForm(wrapper);

		const reportText = wrapper.find("#series_report").text();
		expect(reportText).toContain("Dates réservées : 1");
		expect(reportText).toContain("Dates non réservées : 2");
		expect(reportText).toContain("mardi 30/03/2027 : déjà réservée");
		expect(reportText).toContain("mardi 06/04/2027 : salle désactivée");
		expect(reportText).not.toContain("Toutes les dates");
	});

	it("n'affiche pas de rapport si le backend refuse la série", async () => {
		vi.mocked(bookingSeriesService.create).mockRejectedValue({
			message: "Aucune occurrence à venir dans cette plage de semaines",
		});

		const wrapper = await mountAndFillForm(12, 14);
		await submitForm(wrapper);

		expect(wrapper.find("#series_report").exists()).toBe(false);
	});
});
