// Tests unitaires de la conversion d'une date UTC en date de Paris
// Rappel : Paris est à UTC+1 en hiver et à UTC+2 en été

import { describe, expect, it } from "vitest";
import { toParisIsoDate } from "./parisDate";

describe("toParisIsoDate", () => {
	it("renvoie la date d'un cours en été, au format AAAA-MM-JJ", () => {
		// 08:00 UTC = 10h à Paris (heure d'été)
		expect(toParisIsoDate("2027-03-30T08:00:00.000Z")).toBe("2027-03-30");
	});

	it("garde le 0 devant le jour et le mois, en hiver", () => {
		// 09:00 UTC = 10h à Paris (heure d'hiver)
		expect(toParisIsoDate("2027-01-05T09:00:00.000Z")).toBe("2027-01-05");
	});

	it("renvoie le lendemain quand le cours commence à Paris après minuit", () => {
		// Le 29 mars à 22:30 UTC, il est déjà 00h30 le 30 mars à Paris (heure d'été)
		expect(toParisIsoDate("2027-03-29T22:30:00.000Z")).toBe("2027-03-30");
	});
});
