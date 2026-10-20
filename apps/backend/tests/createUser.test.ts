import { describe, expect, it } from "@jest/globals";
import { createUserSchema } from "../src/dtos/createUser.dto.js";

describe("createUserSchema", () => {
	it("should accept valid user data", () => {
		const result = createUserSchema.parse({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "reservation-salle-b204",
		});
		expect(result).toEqual({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "reservation-salle-b204",
		});
	});

	it("should accept firstname at max length", () => {
		const result = createUserSchema.parse({
			firstname: "a".repeat(50),
			lastname: "Doe",
			email: "john@example.com",
			password: "reservation-salle-b204",
		});
		expect(result.firstname).toBe("a".repeat(50));
	});

	it("should accept a password of exactly 12 characters", () => {
		const result = createUserSchema.parse({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "b204-reserve",
		});
		expect(result.password).toBe("b204-reserve");
	});

	it("should reject a password of 11 characters", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "b204-reserv",
			}),
		).toThrow();
	});

	it("should accept a password of 128 characters", () => {
		const result = createUserSchema.parse({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "a".repeat(128),
		});
		expect(result.password).toBe("a".repeat(128));
	});

	it("should reject a password longer than 128 characters", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "a".repeat(129),
			}),
		).toThrow();
	});

	// Pas de règle de composition : pas besoin de majuscule, de chiffre
	// ou de caractère spécial. Les espaces et les accents sont acceptés.
	it("should accept a password with only lowercase letters, spaces and accents", () => {
		const result = createUserSchema.parse({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "réservation de la salle",
		});
		expect(result.password).toBe("réservation de la salle");
	});

	// "e" + accent (2 caractères) doit devenir "é" (1 seul caractère)
	it("should normalize the password to the NFC form", () => {
		const result = createUserSchema.parse({
			firstname: "John",
			lastname: "Doe",
			email: "john@example.com",
			password: "salle de cafe\u0301",
		});
		expect(result.password).toBe("salle de caf\u00e9");
	});

	it("should reject empty firstname", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "",
				lastname: "Doe",
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject firstname exceeding max length", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "a".repeat(51),
				lastname: "Doe",
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject empty lastname", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "",
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject lastname exceeding max length", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "a".repeat(51),
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject invalid email", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "not-an-email",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject empty email", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject short password", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "short",
			}),
		).toThrow();
	});

	it("should reject empty password", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
				password: "",
			}),
		).toThrow();
	});

	it("should reject missing firstname", () => {
		expect(() =>
			createUserSchema.parse({
				lastname: "Doe",
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject missing lastname", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				email: "john@example.com",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject missing email", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				password: "reservation-salle-b204",
			}),
		).toThrow();
	});

	it("should reject missing password", () => {
		expect(() =>
			createUserSchema.parse({
				firstname: "John",
				lastname: "Doe",
				email: "john@example.com",
			}),
		).toThrow();
	});
});
