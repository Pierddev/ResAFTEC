import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import type { IndexController as IndexControllerType } from "../src/controllers/indexController.js";

const mockRegister = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLogin = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.unstable_mockModule("../src/services/indexService.js", () => ({
	UserService: jest.fn().mockImplementation(() => ({
		register: mockRegister,
		login: mockLogin,
	})),
}));

const { IndexController } = await import(
	"../src/controllers/indexController.js"
);

describe("IndexController", () => {
	let controller: IndexControllerType;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;

	beforeEach(() => {
		controller = new IndexController();

		mockReq = {
			body: {},
		};

		mockRes = {
			status: jest.fn().mockReturnThis() as unknown as Response["status"],
			json: jest.fn() as unknown as Response["json"],
			send: jest.fn() as unknown as Response["send"],
			cookie: jest.fn() as unknown as Response["cookie"],
			clearCookie: jest.fn() as unknown as Response["clearCookie"],
		};

		jest.clearAllMocks();
	});

	describe("home", () => {
		it("should return welcome message", () => {
			controller.home(mockReq as Request, mockRes as Response);

			expect(mockRes.send).toHaveBeenCalledWith("Reservation Salles API");
		});
	});

	describe("register", () => {
		const validBody = {
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "reservation-salle-b204",
		};

		it("should return 400 if the request body is invalid", async () => {
			mockReq.body = { firstname: "" };

			await controller.register(mockReq as Request, mockRes as Response);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "Failed to validate request",
				error: expect.any(Array),
			});
			expect(mockRegister).not.toHaveBeenCalled();
		});

		it("should return 201 if registration is successful", async () => {
			mockReq.body = validBody;

			const fakeUser = {
				id: 1,
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				role: { id: 2, name: "user" },
			};
			mockRegister.mockResolvedValue(fakeUser);

			await controller.register(mockReq as Request, mockRes as Response);

			expect(mockRes.status).toHaveBeenCalledWith(201);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "User registered successfully",
				user: {
					id: 1,
					firstname: "John",
					lastname: "Doe",
					email: "john@example.com",
					role: 2,
					roleName: "user",
				},
			});
		});

		it("should return 400 if the service returns an error", async () => {
			mockReq.body = validBody;

			mockRegister.mockRejectedValue(new Error("Email déjà utilisé"));

			await controller.register(mockReq as Request, mockRes as Response);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "Email déjà utilisé",
			});
		});
	});

	describe("login", () => {
		const validBody = {
			email: "john@example.com",
			password: "password123",
		};

		it("should return 400 if the request body is invalid", async () => {
			mockReq.body = { email: "pas-un-email", password: "short" };

			await controller.login(mockReq as Request, mockRes as Response);

			expect(mockRes.status).toHaveBeenCalledWith(400);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "Incorrect password or email address.",
				error: expect.any(Array),
			});
			expect(mockLogin).not.toHaveBeenCalled();
		});

		it("should return 200 and set a cookie if login is successful", async () => {
			mockReq.body = validBody;

			const fakeResponse = {
				token: "jwt-token-123",
				user: {
					id: 1,
					firstname: "John",
					lastname: "Doe",
					email: "john@example.com",
					role: { id: 2, name: "user" },
				},
			};
			mockLogin.mockResolvedValue(fakeResponse);

			await controller.login(mockReq as Request, mockRes as Response);

			// Vérifie le cookie HttpOnly
			expect(mockRes.cookie).toHaveBeenCalledWith("token", "jwt-token-123", {
				httpOnly: true,
				sameSite: "lax",
				secure: false,
			});

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "User logged in successfully",
				user: {
					id: 1,
					firstname: "John",
					lastname: "Doe",
					email: "john@example.com",
					role: 2,
					roleName: "user",
				},
			});
		});

		it("should return 401 if the service returns an error", async () => {
			mockReq.body = validBody;

			mockLogin.mockRejectedValue(new Error("Identifiants incorrects"));

			await controller.login(mockReq as Request, mockRes as Response);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "Identifiants incorrects",
			});
		});
	});

	describe("logout", () => {
		it("should clear the cookie and return 200", () => {
			controller.logout(mockReq as Request, mockRes as Response);

			expect(mockRes.clearCookie).toHaveBeenCalledWith("token", {
				httpOnly: true,
				sameSite: "lax",
				secure: false,
			});
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalledWith({
				message: "User logged out successfully",
			});
		});
	});
});
