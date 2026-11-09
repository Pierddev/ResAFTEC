// Tests unitaires de la conversion d'une semaine ISO en dates
// Rappel : une date seule "AAAA-MM-JJ" est lue par new Date() à minuit UTC

import { describe, expect, it } from "vitest";
import {
	formatWeekRange,
	getMondayOfIsoWeek,
	getSundayOfIsoWeek,
	isValidIsoWeek,
	toIsoDate,
} from "./isoWeek";

describe("getMondayOfIsoWeek et getSundayOfIsoWeek", () => {
	it("renvoie le lundi et le dimanche d'une semaine en milieu d'année", () => {
		expect(getMondayOfIsoWeek(12, 2027)).toEqual(new Date("2027-03-22"));
		expect(getSundayOfIsoWeek(12, 2027)).toEqual(new Date("2027-03-28"));
	});

	it("fait commencer la semaine 1 en décembre de l'année précédente", () => {
		// Le 1er janvier 2026 est un jeudi : la semaine 1 commence le lundi 29 décembre 2025
		expect(getMondayOfIsoWeek(1, 2026)).toEqual(new Date("2025-12-29"));
		expect(getSundayOfIsoWeek(1, 2026)).toEqual(new Date("2026-01-04"));
	});

	it("fait finir la semaine 53 en janvier de l'année suivante", () => {
		expect(getMondayOfIsoWeek(53, 2026)).toEqual(new Date("2026-12-28"));
		expect(getSundayOfIsoWeek(53, 2026)).toEqual(new Date("2027-01-03"));
	});
});

describe("isValidIsoWeek", () => {
	it("accepte les semaines de 1 à 52", () => {
		expect(isValidIsoWeek(1, 2027)).toBe(true);
		expect(isValidIsoWeek(52, 2027)).toBe(true);
	});

	it("accepte la semaine 53 seulement les années qui en ont une", () => {
		expect(isValidIsoWeek(53, 2026)).toBe(true);
		expect(isValidIsoWeek(53, 2027)).toBe(false);
	});

	it("refuse les numéros hors de 1 à 53 et les nombres à virgule", () => {
		expect(isValidIsoWeek(0, 2027)).toBe(false);
		expect(isValidIsoWeek(54, 2026)).toBe(false);
		expect(isValidIsoWeek(12.5, 2027)).toBe(false);
	});
});

describe("toIsoDate", () => {
	it("renvoie la date au format AAAA-MM-JJ attendu par l'API", () => {
		expect(toIsoDate(getMondayOfIsoWeek(12, 2027))).toBe("2027-03-22");
		expect(toIsoDate(getSundayOfIsoWeek(53, 2026))).toBe("2027-01-03");
	});
});

describe("formatWeekRange", () => {
	it("affiche la semaine avec son lundi et son dimanche", () => {
		expect(formatWeekRange(12, 2027)).toBe("S12-2027 : du 22/03 au 28/03");
	});

	it("affiche une semaine à cheval sur deux années", () => {
		expect(formatWeekRange(53, 2026)).toBe("S53-2026 : du 28/12 au 03/01");
	});
});
