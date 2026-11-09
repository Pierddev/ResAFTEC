import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BookingSeriesReport,
	bookingSeriesService,
	type CreateBookingSeriesData,
	type OccurrenceToBook,
	type ReplacementClassroom,
} from "./bookingSeriesService";

// On mock le module apiService pour éviter les vrais appels HTTP
vi.mock("./apiService", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
	},
}));

import api from "./apiService";

// Une série : chaque mardi de 10h à 12h, de la semaine 12 à la semaine 20 de 2027
const seriesData: CreateBookingSeriesData = {
	title: "Cours de TypeScript",
	classroomId: 1,
	reservedForUserId: 2,
	dayOfWeek: 2,
	startTime: "10:00",
	endTime: "12:00",
	startDate: "2027-03-22",
	endDate: "2027-05-23",
};

describe("bookingSeriesService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
		it("doit envoyer la série au backend et renvoyer le rapport de série", async () => {
			// Rapport simulé : une occurrence réservée, une en échec
			const fakeReport: BookingSeriesReport = {
				series: { id: 1, title: "Cours de TypeScript" },
				booked: [
					{
						id: 51,
						start_at: "2027-03-23T09:00:00.000Z",
						end_at: "2027-03-23T11:00:00.000Z",
					},
				],
				failed: [{ date: "2027-03-30T08:00:00.000Z", reason: "disabled" }],
			};

			// On simule une réponse réussie de l'API
			vi.mocked(api.post).mockResolvedValue({ data: fakeReport });

			const result = await bookingSeriesService.create(seriesData);

			// Vérifications
			expect(api.post).toHaveBeenCalledWith(
				"/create-booking-series",
				seriesData,
			);
			expect(result).toEqual(fakeReport);
		});

		it("doit propager l'erreur si l'API refuse la série", async () => {
			const apiError = {
				message: "Une série ne peut pas dépasser 52 semaines",
			};
			vi.mocked(api.post).mockRejectedValue(apiError);

			await expect(bookingSeriesService.create(seriesData)).rejects.toEqual(
				apiError,
			);
		});
	});

	describe("getReplacementClassrooms", () => {
		it("doit demander les salles libres de la série à cette date et les renvoyer", async () => {
			// Salle simulée : A201, au 2e étage du bâtiment A
			const fakeClassrooms: ReplacementClassroom[] = [
				{
					id: 6,
					name: "A201",
					capacity: 30,
					floor: { id: 2, level: 2, building: { id: 1, name: "Bâtiment A" } },
				},
			];
			vi.mocked(api.get).mockResolvedValue({
				data: { classrooms: fakeClassrooms },
			});

			const result = await bookingSeriesService.getReplacementClassrooms(
				1,
				"2027-03-30",
			);

			// La date part dans l'adresse : /get-replacement-classrooms/1?date=2027-03-30
			expect(api.get).toHaveBeenCalledWith("/get-replacement-classrooms/1", {
				params: { date: "2027-03-30" },
			});
			expect(result).toEqual(fakeClassrooms);
		});

		it("doit propager l'erreur si l'API refuse la recherche", async () => {
			const apiError = { message: "La date ne tombe pas le jour de la série" };
			vi.mocked(api.get).mockRejectedValue(apiError);

			await expect(
				bookingSeriesService.getReplacementClassrooms(1, "2027-03-31"),
			).rejects.toEqual(apiError);
		});
	});

	describe("addOccurrences", () => {
		// Deux dates en échec, chacune dans une salle de remplacement différente
		const occurrences: OccurrenceToBook[] = [
			{ date: "2027-03-30", classroomId: 6 },
			{ date: "2027-04-06", classroomId: 8 },
		];

		it("doit envoyer les dates et les salles choisies, et renvoyer le nouveau rapport", async () => {
			// Rapport simulé : la première date est réservée, la deuxième salle a été prise entre-temps
			const fakeReport: BookingSeriesReport = {
				series: { id: 1, title: "Cours de TypeScript" },
				booked: [
					{
						id: 60,
						start_at: "2027-03-30T08:00:00.000Z",
						end_at: "2027-03-30T10:00:00.000Z",
					},
				],
				failed: [
					{ date: "2027-04-06T08:00:00.000Z", reason: "already_booked" },
				],
			};
			vi.mocked(api.post).mockResolvedValue({ data: fakeReport });

			const result = await bookingSeriesService.addOccurrences(1, occurrences);

			expect(api.post).toHaveBeenCalledWith(
				"/add-booking-series-occurrences/1",
				occurrences,
			);
			expect(result).toEqual(fakeReport);
		});

		it("doit propager l'erreur si l'API refuse la réservation", async () => {
			const apiError = { message: "Cette occurrence a déjà commencé" };
			vi.mocked(api.post).mockRejectedValue(apiError);

			await expect(
				bookingSeriesService.addOccurrences(1, occurrences),
			).rejects.toEqual(apiError);
		});
	});
});
