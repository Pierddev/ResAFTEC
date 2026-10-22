import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Response } from "express";
import type { BookingSeriesController as BookingSeriesControllerType } from "../src/controllers/bookingSeriesController.js";
import type { AuthRequest } from "../src/middleware/authenticate.js";

const mockCreate = jest.fn<(...args: unknown[]) => Promise<unknown>>();

// On remplace le service : le contrôleur est testé sans base de données
jest.unstable_mockModule("../src/services/bookingSeriesService.js", () => ({
	BookingSeriesService: jest.fn().mockImplementation(() => ({
		create: mockCreate,
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
