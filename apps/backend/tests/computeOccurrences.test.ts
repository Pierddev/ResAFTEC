import { describe, expect, it } from "@jest/globals";
import {
	computeOccurrences,
	type SeriesSchedule,
} from "../src/utils/computeOccurrences.js";

// Série de base : chaque mardi de 10h à 12h, pendant 3 semaines
// (du lundi 19 octobre au dimanche 8 novembre 2026)
const schedule: SeriesSchedule = {
	startDate: "2026-10-19",
	endDate: "2026-11-08",
	dayOfWeek: 2,
	startTime: "10:00",
	endTime: "12:00",
};

describe("computeOccurrences", () => {
	it("should return one occurrence per week at 10:00-12:00 Paris time, even after the change of time", () => {
		// "Maintenant" est fixé avant la série : toutes les occurrences sont à venir.
		// Avec new Date(), le résultat changerait selon le jour du test.
		const now = new Date("2026-01-01T00:00:00Z");

		const occurrences = computeOccurrences(schedule, now);

		// Les dates attendues sont écrites en UTC (le "Z" à la fin).
		// Le 25 octobre 2026, Paris passe de l'heure d'été (UTC+2) à l'heure d'hiver (UTC+1) :
		// 10h à Paris = 8h UTC avant, puis 9h UTC après.
		expect(occurrences).toEqual([
			{
				start_at: new Date("2026-10-20T08:00:00Z"),
				end_at: new Date("2026-10-20T10:00:00Z"),
			},
			{
				start_at: new Date("2026-10-27T09:00:00Z"),
				end_at: new Date("2026-10-27T11:00:00Z"),
			},
			{
				start_at: new Date("2026-11-03T09:00:00Z"),
				end_at: new Date("2026-11-03T11:00:00Z"),
			},
		]);
	});

	it("should skip occurrences that have already started", () => {
		// Le mardi 20 octobre à 11h (heure de Paris) : le 1er cours est en train d'avoir lieu
		const now = new Date("2026-10-20T09:00:00Z");

		const occurrences = computeOccurrences(schedule, now);

		expect(occurrences).toHaveLength(2);
		expect(occurrences[0]?.start_at).toEqual(new Date("2026-10-27T09:00:00Z"));
	});
});
