import { describe, expect, it } from "@jest/globals";
import { addBookingSeriesOccurrencesSchema } from "../src/dtos/addBookingSeriesOccurrences.dto.js";

// Deux occurrences en échec, à réserver dans des salles de remplacement
const validOccurrences = [
	{ date: "2026-11-10", classroomId: 4 },
	{ date: "2026-11-17", classroomId: 6 },
];

describe("addBookingSeriesOccurrencesSchema", () => {
	it("should accept a series ID from the URL and a list of occurrences, and turn the ID into a number", () => {
		// Dans une URL, tout est du texte : l'ID arrive sous la forme "7"
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "7",
			occurrences: validOccurrences,
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ seriesId: 7, occurrences: validOccurrences });
	});

	it("should reject an ID that is not a number, a date in the wrong format and a missing classroom", () => {
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "abc", // l'ID doit être un nombre
			occurrences: [
				{ date: "10/11/2026", classroomId: 4 }, // la date doit être au format "AAAA-MM-JJ"
				{ date: "2026-11-17" }, // la salle a été oubliée
			],
		});

		expect(result.success).toBe(false);
		// path = chemin du champ en erreur, ex. : ["occurrences", 0, "date"]
		expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
			"seriesId",
			"occurrences.0.date",
			"occurrences.1.classroomId",
		]);
	});

	it("should reject a body that is not a list", () => {
		// Le client a oublié les crochets [ ] autour de l'occurrence
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "7",
			occurrences: { date: "2026-11-10", classroomId: 4 },
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(
			"Le corps doit être une liste d'occurrences",
		);
	});

	it("should reject an empty list", () => {
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "7",
			occurrences: [],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(
			"Il faut au moins une occurrence à réserver",
		);
	});

	it("should reject the same date twice", () => {
		// Le 10 novembre est demandé dans deux salles différentes
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "7",
			occurrences: [
				{ date: "2026-11-10", classroomId: 4 },
				{ date: "2026-11-10", classroomId: 6 },
			],
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(
			"Une date ne peut apparaître qu'une seule fois",
		);
	});

	it("should reject more than 52 occurrences", () => {
		// 53 occurrences : une de plus que le nombre maximum de semaines
		const tooManyOccurrences = new Array(53).fill({
			date: "2026-11-10",
			classroomId: 4,
		});

		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: "7",
			occurrences: tooManyOccurrences,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.message)).toContain(
			"Il ne peut pas y avoir plus de 52 occurrences",
		);
	});
});
