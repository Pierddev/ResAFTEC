import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Response } from "express";
import type { BookingSeriesController as BookingSeriesControllerType } from "../src/controllers/bookingSeriesController.js";
import type { AuthRequest } from "../src/middleware/authenticate.js";

const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockFindById = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetReplacementClassrooms =
	jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockAddOccurrences = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// On remplace le service : le contrôleur est testé sans base de données
jest.unstable_mockModule("../src/services/bookingSeriesService.js", () => ({
	BookingSeriesService: jest.fn().mockImplementation(() => ({
		create: mockCreate,
		findById: mockFindById,
		getReplacementClassrooms: mockGetReplacementClassrooms,
		addOccurrences: mockAddOccurrences,
	})),
}));

// Le contrôleur est importé APRÈS les mocks
const { BookingSeriesController } = await import(
	"../src/controllers/bookingSeriesController.js"
);

// Corps de requête valide : chaque mardi de 10h à 12h, pour l'utilisateur 2
const validBody = {
	title: "Cours de TypeScript",
	classroomId: 1,
	reservedForUserId: 2,
	dayOfWeek: 2,
	startTime: "10:00",
	endTime: "12:00",
	startDate: "2026-11-02",
	endDate: "2026-12-13",
};

describe("BookingSeriesController", () => {
	let controller: BookingSeriesControllerType;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		controller = new BookingSeriesController();
		mockRes = {
			status: jest.fn().mockReturnThis() as unknown as Response["status"],
			json: jest.fn() as unknown as Response["json"],
		};
		jest.clearAllMocks();
	});

	it("should return 201 with the series report when a teacher books for themself", async () => {
		// Le formateur connecté (id 2) réserve pour lui-même
		const mockReq = { body: validBody, userId: 2, role: "teacher" };
		const fakeSeries = { id: 10, title: "Cours de TypeScript" };
		const start_at = new Date("2026-11-03T09:00:00Z");
		const end_at = new Date("2026-11-03T11:00:00Z");
		const failedDate = new Date("2026-11-10T09:00:00Z");

		mockCreate.mockResolvedValue({
			series: fakeSeries,
			booked: [{ id: 50, title: "Cours de TypeScript", start_at, end_at }],
			failed: [{ date: failedDate, reason: "already_booked" }],
		});

		await controller.create(mockReq as AuthRequest, mockRes as Response);

		expect(mockRes.status).toHaveBeenCalledWith(201);
		expect(mockRes.json).toHaveBeenCalledWith({
			series: fakeSeries,
			booked: [{ id: 50, start_at, end_at }],
			failed: [{ date: failedDate, reason: "already_booked" }],
		});
	});

	it("should return 403 when a teacher books for someone else", async () => {
		// Le formateur connecté (id 3) essaie de réserver pour l'utilisateur 2
		const mockReq = { body: validBody, userId: 3, role: "teacher" };

		await controller.create(mockReq as AuthRequest, mockRes as Response);

		expect(mockRes.status).toHaveBeenCalledWith(403);
		expect(mockCreate).not.toHaveBeenCalled();
	});
});

describe("BookingSeriesController.getReplacementClassrooms", () => {
	let controller: BookingSeriesControllerType;
	let mockRes: Partial<Response>;

	// Série créée par l'utilisateur 2.
	// La base renvoie les id bigint sous forme de texte : "2".
	const series = { id: "7", user: { id: "2" } };
	const freeClassrooms = [{ id: 5, name: "B102", capacity: 25 }];

	// Requête valide : l'ID de la série dans l'URL, la date en paramètre
	const validRequest = {
		params: { seriesId: "7" },
		query: { date: "2026-11-10" },
	};

	beforeEach(() => {
		controller = new BookingSeriesController();
		mockRes = {
			status: jest.fn().mockReturnThis() as unknown as Response["status"],
			json: jest.fn() as unknown as Response["json"],
		};
		jest.clearAllMocks();
	});

	it("should return 200 with the free classrooms when the author asks", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(series);
		mockGetReplacementClassrooms.mockResolvedValue(freeClassrooms);

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		// L'ID "7" de l'URL a été transformé en nombre par le schéma Zod
		expect(mockFindById).toHaveBeenCalledWith(7);
		expect(mockGetReplacementClassrooms).toHaveBeenCalledWith(
			series,
			"2026-11-10",
		);
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ classrooms: freeClassrooms });
	});

	it("should return 200 when an admin asks for someone else's series", async () => {
		// L'administrateur (id 1) n'est pas l'auteur de la série
		const mockReq = { ...validRequest, userId: 1, role: "admin" };
		mockFindById.mockResolvedValue(series);
		mockGetReplacementClassrooms.mockResolvedValue(freeClassrooms);

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(200);
	});

	it("should return 403 when a teacher asks for someone else's series", async () => {
		// Le formateur 3 n'est pas l'auteur de la série
		const mockReq = { ...validRequest, userId: 3, role: "teacher" };
		mockFindById.mockResolvedValue(series);

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(403);
		expect(mockGetReplacementClassrooms).not.toHaveBeenCalled();
	});

	it("should return 404 when the series does not exist", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(null);

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(404);
		expect(mockRes.json).toHaveBeenCalledWith({ message: "Série introuvable" });
	});

	it("should return 400 when the parameters are invalid", async () => {
		const mockReq = {
			params: { seriesId: "abc" },
			query: {}, // ?date= oublié
			userId: 2,
			role: "teacher",
		};

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		// La base n'est même pas interrogée
		expect(mockFindById).not.toHaveBeenCalled();
	});

	it("should return 400 when the date is not an occurrence of the series", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(series);
		mockGetReplacementClassrooms.mockRejectedValue(
			new Error("La date ne tombe pas le jour de la série"),
		);

		await controller.getReplacementClassrooms(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			message: "La date ne tombe pas le jour de la série",
		});
	});
});

describe("BookingSeriesController.addOccurrences", () => {
	let controller: BookingSeriesControllerType;
	let mockRes: Partial<Response>;

	// Série créée par l'utilisateur 2, telle que findById la renvoie :
	// l'auteur est chargé en entier, avec son mot de passe haché
	const series = {
		id: "7",
		title: "Cours de TypeScript",
		user: { id: "2", email: "formateur@aftec.fr", password: "$argon2id$hash" },
		reservedForUser: { id: "2" },
		day_of_week: 2,
		start_time: "10:00:00",
		end_time: "12:00:00",
		start_date: "2026-11-02",
		end_date: "2026-12-13",
		created_at: new Date("2026-10-01T08:00:00Z"),
	};

	// Deux occurrences en échec, à réserver dans des salles de remplacement
	const occurrences = [
		{ date: "2026-11-10", classroomId: 4 },
		{ date: "2026-11-17", classroomId: 6 },
	];

	// Requête valide : l'ID de la série dans l'URL, la liste dans le corps
	const validRequest = { params: { seriesId: "7" }, body: occurrences };

	const start_at = new Date("2026-11-10T09:00:00Z");
	const end_at = new Date("2026-11-10T11:00:00Z");
	const failedDate = new Date("2026-11-17T09:00:00Z");

	// Rapport renvoyé par le service : une réservée, une prise entre-temps
	const report = {
		series: series,
		booked: [{ id: 51, title: "Cours de TypeScript", start_at, end_at }],
		failed: [{ date: failedDate, reason: "already_booked" }],
	};

	beforeEach(() => {
		controller = new BookingSeriesController();
		mockRes = {
			status: jest.fn().mockReturnThis() as unknown as Response["status"],
			json: jest.fn() as unknown as Response["json"],
		};
		jest.clearAllMocks();
	});

	it("should return 201 with the series report, without the author's password", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(series);
		mockAddOccurrences.mockResolvedValue(report);

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		// L'ID "7" de l'URL a été transformé en nombre par le schéma Zod
		expect(mockFindById).toHaveBeenCalledWith(7);
		expect(mockAddOccurrences).toHaveBeenCalledWith(series, occurrences, 2);
		expect(mockRes.status).toHaveBeenCalledWith(201);
		// toEqual vérifie l'objet exact : la série n'a pas de champ "user",
		// donc ni l'e-mail ni le mot de passe haché de l'auteur
		expect(mockRes.json).toHaveBeenCalledWith({
			series: {
				id: "7",
				title: "Cours de TypeScript",
				day_of_week: 2,
				start_time: "10:00:00",
				end_time: "12:00:00",
				start_date: "2026-11-02",
				end_date: "2026-12-13",
				created_at: new Date("2026-10-01T08:00:00Z"),
			},
			booked: [{ id: 51, start_at, end_at }],
			failed: [{ date: failedDate, reason: "already_booked" }],
		});
	});

	it("should return 201 when an admin books for someone else's series", async () => {
		// L'administrateur (id 1) n'est pas l'auteur de la série
		const mockReq = { ...validRequest, userId: 1, role: "admin" };
		mockFindById.mockResolvedValue(series);
		mockAddOccurrences.mockResolvedValue(report);

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		// L'administrateur est l'auteur des nouvelles réservations
		expect(mockAddOccurrences).toHaveBeenCalledWith(series, occurrences, 1);
		expect(mockRes.status).toHaveBeenCalledWith(201);
	});

	it("should return 403 when a teacher books for someone else's series", async () => {
		// Le formateur 3 n'est pas l'auteur de la série
		const mockReq = { ...validRequest, userId: 3, role: "teacher" };
		mockFindById.mockResolvedValue(series);

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(403);
		expect(mockAddOccurrences).not.toHaveBeenCalled();
	});

	it("should return 404 when the series does not exist", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(null);

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(404);
		expect(mockRes.json).toHaveBeenCalledWith({ message: "Série introuvable" });
	});

	it("should return 400 when the body is not a list", async () => {
		const mockReq = {
			params: { seriesId: "7" },
			body: { date: "2026-11-10", classroomId: 4 }, // crochets [ ] oubliés
			userId: 2,
			role: "teacher",
		};

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		// La base n'est même pas interrogée
		expect(mockFindById).not.toHaveBeenCalled();
	});

	it("should return 400 when a date is not an occurrence of the series", async () => {
		const mockReq = { ...validRequest, userId: 2, role: "teacher" };
		mockFindById.mockResolvedValue(series);
		mockAddOccurrences.mockRejectedValue(
			new Error("La date ne tombe pas le jour de la série"),
		);

		await controller.addOccurrences(
			mockReq as unknown as AuthRequest,
			mockRes as Response,
		);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			message: "La date ne tombe pas le jour de la série",
		});
	});
});
