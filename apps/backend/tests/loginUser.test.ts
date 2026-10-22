import { describe, expect, it } from "@jest/globals";
import { loginUserSchema } from "../src/dtos/loginUser.dto.js";

describe("loginUserSchema", () => {
	it("should accept valid login data", () => {
		const result = loginUserSchema.parse({
			email: "test@example.com",
			password: "password123",
		});
		expect(result).toEqual({
			email: "test@example.com",
			password: "password123",
		});
	});

	it("should reject an invalid email", () => {
		expect(() =>
			loginUserSchema.parse({
				email: "not-an-email",
				password: "password123",
			}),
		).toThrow();
	});

	// Les règles d'inscription (12 caractères minimum...) ne s'appliquent pas
	// au login : un ancien compte doit toujours pouvoir se connecter.
	it("should accept a short password", () => {
		const result = loginUserSchema.parse({
			email: "test@example.com",
			password: "short",
		});
		expect(result.password).toBe("short");
	});

	it("should accept a password of 128 characters", () => {
		const result = loginUserSchema.parse({
			email: "test@example.com",
			password: "a".repeat(128),
		});
		expect(result.password).toBe("a".repeat(128));
	});

	it("should reject a password longer than 128 characters", () => {
		expect(() =>
			loginUserSchema.parse({
				email: "test@example.com",
				password: "a".repeat(129),
			}),
		).toThrow();
	});

	// "e" + accent (2 caractères) doit devenir "é" (1 seul caractère)
	it("should normalize the password to the NFC form", () => {
		const result = loginUserSchema.parse({
			email: "test@example.com",
			password: "cafe\u0301",
		});
		expect(result.password).toBe("caf\u00e9");
	});

	it("should reject empty email", () => {
		expect(() =>
			loginUserSchema.parse({
				email: "",
				password: "password123",
			}),
		).toThrow();
	});

	it("should reject empty password", () => {
		expect(() =>
			loginUserSchema.parse({
				email: "test@example.com",
				password: "",
			}),
		).toThrow();
	});

	it("should reject missing email", () => {
		expect(() =>
			loginUserSchema.parse({
				password: "password123",
			}),
		).toThrow();
	});

	it("should reject missing password", () => {
		expect(() =>
			loginUserSchema.parse({
				email: "test@example.com",
			}),
		).toThrow();
	});
});
