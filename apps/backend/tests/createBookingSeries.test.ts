import { describe, expect, it } from "@jest/globals";
import { createBookingSeriesSchema } from "../src/dtos/createBookingSeries.dto.js";

// Données valides : chaque mardi de 10h à 12h,
// du lundi 2 novembre au dimanche 13 décembre 2026
const validData = {
	title: "Cours de TypeScript",
	classroomId: 1,
	reservedForUserId: 2,
	dayOfWeek: 2,
	startTime: "10:00",
	endTime: "12:00",
	startDate: "2026-11-02",
	endDate: "2026-12-13",
};

describe("createBookingSeriesSchema", () => {
	it("should accept valid booking series data", () => {
		const result = createBookingSeriesSchema.safeParse(validData);

		expect(result.success).toBe(true);
	});

	it("should reject a day, a time and a date in the wrong format", () => {
		const result = createBookingSeriesSchema.safeParse({
			...validData,
			dayOfWeek: 8, // le jour doit être entre 1 et 7
			startTime: "10h", // l'heure doit être au format "HH:mm"
			startDate: "02/11/2026", // la date doit être au format "AAAA-MM-JJ"
		});

		expect(result.success).toBe(false);
		// path[0] = nom du champ qui a provoqué l'erreur
		expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
			"dayOfWeek",
			"startTime",
			"startDate",
		]);
	});
});
