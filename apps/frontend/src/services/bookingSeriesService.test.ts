import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BookingSeriesReport,
	bookingSeriesService,
	type CreateBookingSeriesData,
} from "./bookingSeriesService";

// On mock le module apiService pour éviter les vrais appels HTTP
vi.mock("./apiService", () => ({
	default: {
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
});
