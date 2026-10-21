import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { argon2Options } from "../config/argon2.js";
import { env } from "../config/env.js";
import { AppDataSource } from "../database/data-source.js";
import type { createUserDto } from "../dtos/createUser.dto.js";
import type { loginUserDto } from "../dtos/loginUser.dto.js";
import { Role } from "../entity/Role.entity.js";
import { User } from "../entity/User.entity.js";

export class UserService {
	async register(dto: createUserDto) {
		const userRepository = AppDataSource.getRepository(User);
		const roleRepository = AppDataSource.getRepository(Role);

		// Check if user already exists
		const existingUser = await userRepository.findOneBy({ email: dto.email });
		if (existingUser) {
			throw new Error("User already exists");
		}

		// Add role to user --> default role is "student"
		const defaultRole = await roleRepository.findOneBy({ name: "student" });
		if (!defaultRole) {
			throw new Error("Default role not found");
		}

		// Hash password (réglages d'Argon2id dans config/argon2.ts)
		const hashedPassword = await argon2.hash(dto.password, argon2Options);

		// Create user
		const user = userRepository.create({
			firstname: dto.firstname,
			lastname: dto.lastname,
			email: dto.email,
			password: hashedPassword,
			role: defaultRole,
		});

		return await userRepository.save(user);
	}

	async login(dto: loginUserDto) {
		const userRepository = AppDataSource.getRepository(User);

		// Check if user exists with role (we need the role to generate the token)
		const user = await userRepository.findOne({
			where: { email: dto.email },
			relations: { role: true },
		});

		// For security reason we do not distinguish between user not found and invalid password
		if (!user) {
			throw new Error("Incorrect password or email address.");
		}

		// Compare password
		// Attention à l'ordre : d'abord le hash enregistré, puis le mot de passe
		// saisi. argon2 relit le sel et les réglages (m, t, p) dans le hash.
		const isPasswordValid = await argon2.verify(user.password, dto.password);
		if (!isPasswordValid) {
			// For security reason we do not distinguish between user not found and invalid password
			throw new Error("Incorrect password or email address.");
		}

		// Generate token
		const token = jwt.sign(
			{
				userId: user.id,
				role: user.role.name,
			},
			`${env.jwtSecret}`,
			{ expiresIn: "1h" },
		);

		// Return token
		return { token, user };
	}
}
