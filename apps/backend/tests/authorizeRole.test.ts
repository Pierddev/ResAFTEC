import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { authorizeRole } from "../src/middleware/authorizeRole.js";

describe("authorizeRole", () => {
	let mockRes: Partial<Response>;
	let mockNext: jest.Mock;

	beforeEach(() => {
		mockRes = {
			status: jest.fn().mockReturnThis() as unknown as Response["status"],
			json: jest.fn() as unknown as Response["json"],
		};
		mockNext = jest.fn();
	});

	it("should call next() if the role is allowed", () => {
		// req.role est rempli par authenticate dans la vraie application
		const mockReq = { role: "teacher" };

		authorizeRole(["teacher", "admin"])(
			mockReq as unknown as Request,
			mockRes as Response,
			mockNext,
		);

		expect(mockNext).toHaveBeenCalled();
		expect(mockRes.status).not.toHaveBeenCalled();
	});

	it("should return 403 if the role is not allowed", () => {
		const mockReq = { role: "student" };

		authorizeRole(["teacher", "admin"])(
			mockReq as unknown as Request,
			mockRes as Response,
			mockNext,
		);

		expect(mockRes.status).toHaveBeenCalledWith(403);
		expect(mockRes.json).toHaveBeenCalledWith({ message: "Accès refusé" });
		expect(mockNext).not.toHaveBeenCalled();
	});
});
