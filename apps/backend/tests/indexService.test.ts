import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { argon2Options } from "../src/config/argon2.js";
import type { UserService as UserServiceType } from "../src/services/indexService.js";

// --- Reusable mocks ---
const mockRepository = {
	findOneBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	create: jest.fn<(...args: unknown[]) => unknown>(),
	save: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
};

const mockArgon2Hash = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockArgon2Verify = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockJwtSign = jest.fn<(...args: unknown[]) => unknown>();

// --- Mocking modules before service import ---
jest.unstable_mockModule("../src/database/data-source.js", () => ({
	AppDataSource: {
		getRepository: jest.fn(() => mockRepository),
	},
}));

jest.unstable_mockModule("argon2", () => ({
	default: {
		hash: mockArgon2Hash,
		verify: mockArgon2Verify,
	},
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
	default: {
		sign: mockJwtSign,
	},
}));

// Au chargement, le service calcule son hash factice avec argon2.hash
const dummyHash = "dummyHash";
mockArgon2Hash.mockResolvedValueOnce(dummyHash);

// --- Service import (after setting up mocks) ---
const { UserService } = await import("../src/services/indexService.js");

// --- Tests ---
describe("UserService", () => {
	let userService: UserServiceType;

	beforeEach(() => {
		userService = new UserService();
		jest.clearAllMocks();
	});

	describe("register", () => {
		it("should create a user when the email is not already taken", async () => {
			// Arrange
			const dto = {
				firstname: "John",
				lastname: "Doe",
				email: "john.doe@example.com",
				password: "password123",
			};
			const fakeRole = { id: 1, name: "student" };
			const fakeUser = {
				id: 1,
				firstname: "John",
				lastname: "Doe",
				email: "john.doe@example.com",
				password: "hashedPwd",
				role: fakeRole,
			};

			mockRepository.findOneBy
				.mockResolvedValueOnce(null) // 1st call: no existing user
				.mockResolvedValueOnce(fakeRole); // 2nd call: role found
			mockRepository.create.mockReturnValue(fakeUser);
			mockRepository.save.mockResolvedValue(fakeUser);
			mockArgon2Hash.mockResolvedValue("hashedPwd");

			// Act
			const result = await userService.register(dto);

			// Assert
			expect(result).toEqual(fakeUser);
			expect(mockRepository.findOneBy).toHaveBeenCalledWith({
				email: dto.email,
			});
			expect(mockRepository.findOneBy).toHaveBeenCalledWith({
				name: "student",
			});
			expect(mockArgon2Hash).toHaveBeenCalledWith(dto.password, argon2Options);
			expect(mockRepository.create).toHaveBeenCalledWith({
				firstname: dto.firstname,
				lastname: dto.lastname,
				email: dto.email,
				password: "hashedPwd",
				role: fakeRole,
			});
			expect(mockRepository.save).toHaveBeenCalledWith(fakeUser);
		});

		it('should throw a "User already exists" error if the email already exists', async () => {
			// Arrange
			const dto = {
				firstname: "John",
				lastname: "Doe",
				email: "existing@example.com",
				password: "password123",
			};

			mockRepository.findOneBy.mockResolvedValueOnce({
				id: 1,
				email: dto.email,
			});

			// Act & Assert
			await expect(userService.register(dto)).rejects.toThrow(
				"User already exists",
			);
		});

		it('should throw a "Default role not found" error if the student role does not exist', async () => {
			// Arrange
			const dto = {
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "password123",
			};

			mockRepository.findOneBy
				.mockResolvedValueOnce(null) // non-existent user
				.mockResolvedValueOnce(null); // role not found

			// Act & Assert
			await expect(userService.register(dto)).rejects.toThrow(
				"Default role not found",
			);
		});
	});

	describe("login", () => {
		it("should return a token and user when credentials are valid", async () => {
			// Arrange
			const dto = {
				email: "john@example.com",
				password: "password123",
			};
			const fakeUser = {
				id: 1,
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "hashedPwd",
				role: { id: 1, name: "student" },
			};
			const fakeToken = "jwt.token.here";

			mockRepository.findOne.mockResolvedValueOnce(fakeUser);
			mockArgon2Verify.mockResolvedValueOnce(true);
			mockJwtSign.mockReturnValueOnce(fakeToken);

			// Act
			const result = await userService.login(dto);

			// Assert
			expect(result).toEqual({ token: fakeToken, user: fakeUser });
			expect(mockRepository.findOne).toHaveBeenCalledWith({
				where: { email: dto.email },
				relations: { role: true },
			});
			// argon2.verify reçoit d'abord le hash, puis le mot de passe saisi
			expect(mockArgon2Verify).toHaveBeenCalledWith(
				fakeUser.password,
				dto.password,
			);
			expect(mockJwtSign).toHaveBeenCalledWith(
				{ userId: fakeUser.id, role: fakeUser.role.name },
				expect.any(String),
				{ expiresIn: "1h" },
			);
		});

		it("should throw an error when the user is not found", async () => {
			// Arrange
			const dto = {
				email: "unknown@example.com",
				password: "password123",
			};

			mockRepository.findOne.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(userService.login(dto)).rejects.toThrow(
				"Incorrect password or email address.",
			);
		});

		it("should verify the password against a dummy hash and still reject when the user is not found", async () => {
			// Arrange
			const dto = {
				email: "unknown@example.com",
				password: "dummy-password",
			};

			mockRepository.findOne.mockResolvedValueOnce(null);
			// Même si le mot de passe correspondait au hash factice,
			// la connexion doit être refusée
			mockArgon2Verify.mockResolvedValueOnce(true);

			// Act & Assert
			await expect(userService.login(dto)).rejects.toThrow(
				"Incorrect password or email address.",
			);
			expect(mockArgon2Verify).toHaveBeenCalledWith(dummyHash, dto.password);
			expect(mockJwtSign).not.toHaveBeenCalled();
		});

		it("should throw an error when the password is incorrect", async () => {
			// Arrange
			const dto = {
				email: "john@example.com",
				password: "wrongpassword",
			};
			const fakeUser = {
				id: 1,
				email: "john@example.com",
				password: "hashedPwd",
				role: { id: 1, name: "student" },
			};

			mockRepository.findOne.mockResolvedValueOnce(fakeUser);
			mockArgon2Verify.mockResolvedValueOnce(false);

			// Act & Assert
			await expect(userService.login(dto)).rejects.toThrow(
				"Incorrect password or email address.",
			);
		});
	});
});
