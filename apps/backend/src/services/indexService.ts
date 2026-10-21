import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { argon2Options } from "../config/argon2.js";
import { env } from "../config/env.js";
import { AppDataSource } from "../database/data-source.js";
import type { createUserDto } from "../dtos/createUser.dto.js";
import type { loginUserDto } from "../dtos/loginUser.dto.js";
import { Role } from "../entity/Role.entity.js";
import { User } from "../entity/User.entity.js";

// Hash "factice", calculé une seule fois au chargement de ce fichier (donc au
// démarrage du serveur), avec les mêmes réglages que les vrais mots de passe.
// Il sert dans login() quand l'email n'existe pas.
const dummyHash = await argon2.hash("dummy-password", argon2Options);

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
			// On vérifie quand même le mot de passe saisi, contre le hash factice.
			// Sans ça, la réponse arriverait plus vite quand l'email n'existe pas
			// (aucun calcul Argon2) : en mesurant ce temps, un attaquant saurait
			// si un compte existe. Le résultat est ignoré : on refuse toujours.
			await argon2.verify(dummyHash, dto.password);
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

		// Si les réglages de config/argon2.ts ont changé depuis la création de ce
		// hash (par exemple plus de mémoire), needsRehash renvoie true : on
		// re-hache alors le mot de passe avec les nouveaux réglages. C'est le seul
		// moment possible, car on a le mot de passe en clair et on sait qu'il est
		// correct (la base ne contient que des hash).
		if (argon2.needsRehash(user.password, argon2Options)) {
			const newHash = await argon2.hash(dto.password, argon2Options);
			// update() modifie seulement la colonne password de cet utilisateur
			await userRepository.update(user.id, { password: newHash });
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
