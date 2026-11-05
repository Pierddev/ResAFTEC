import { describe, expect, it } from "@jest/globals";
import { getReplacementClassroomsSchema } from "../src/dtos/getReplacementClassrooms.dto.js";

describe("getReplacementClassroomsSchema", () => {
	it("should accept a series ID from the URL and a date, and turn the ID into a number", () => {
		// Dans une URL, tout est du texte : l'ID arrive sous la forme "7"
		const result = getReplacementClassroomsSchema.safeParse({
			seriesId: "7",
			date: "2026-11-10",
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ seriesId: 7, date: "2026-11-10" });
	});

	it("should reject an ID that is not a number and a date in the wrong format", () => {
		const result = getReplacementClassroomsSchema.safeParse({
			seriesId: "abc", // l'ID doit être un nombre
			date: "10/11/2026", // la date doit être au format "AAAA-MM-JJ"
		});

		expect(result.success).toBe(false);
		// path[0] = nom du champ qui a provoqué l'erreur
		expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
			"seriesId",
			"date",
		]);
	});

	it("should reject a missing date", () => {
		// Le paramètre ?date= a été oublié dans l'URL
		const result = getReplacementClassroomsSchema.safeParse({
			seriesId: "7",
			date: undefined,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(
			"La date doit être au format AAAA-MM-JJ",
		);
	});
});
