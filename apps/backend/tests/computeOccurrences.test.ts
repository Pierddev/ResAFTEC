import { describe, expect, it } from "@jest/globals";
import {
	computeOccurrenceOnDate,
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

describe("computeOccurrenceOnDate", () => {
	// "Maintenant" est fixé avant la série : toutes les occurrences sont à venir
	const now = new Date("2026-01-01T00:00:00Z");

	it("should return the 10:00-12:00 Paris time slot on the given date, in summer and in winter", () => {
		// 20 octobre : heure d'été, 10h à Paris = 8h UTC
		expect(computeOccurrenceOnDate(schedule, "2026-10-20", now)).toEqual({
			start_at: new Date("2026-10-20T08:00:00Z"),
			end_at: new Date("2026-10-20T10:00:00Z"),
		});

		// 3 novembre : heure d'hiver, 10h à Paris = 9h UTC
		expect(computeOccurrenceOnDate(schedule, "2026-11-03", now)).toEqual({
			start_at: new Date("2026-11-03T09:00:00Z"),
			end_at: new Date("2026-11-03T11:00:00Z"),
		});
	});

	it("should reject a date that is not the day of the series", () => {
		// Le 4 novembre est un mercredi, la série a lieu le mardi
		expect(() => computeOccurrenceOnDate(schedule, "2026-11-04", now)).toThrow(
			"La date ne tombe pas le jour de la série",
		);
	});

	it("should reject a date outside the range of weeks", () => {
		// Le 10 novembre est bien un mardi, mais la série finit le 8 novembre
		expect(() => computeOccurrenceOnDate(schedule, "2026-11-10", now)).toThrow(
			"La date est en dehors de la plage de semaines de la série",
		);
	});

	it("should reject an occurrence that has already started", () => {
		// Le mardi 27 octobre à 10h30 (heure de Paris) : le cours a commencé
		const duringTheCourse = new Date("2026-10-27T09:30:00Z");

		expect(() =>
			computeOccurrenceOnDate(schedule, "2026-10-27", duringTheCourse),
		).toThrow("Cette occurrence a déjà commencé");
	});
});
