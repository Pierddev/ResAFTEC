import { fakerFR as faker } from "@faker-js/faker";
import argon2 from "argon2";
import type { DataSource } from "typeorm";
import { argon2Options } from "../../config/argon2.js";
import type { Role } from "../../entity/Role.entity.js";
import { User } from "../../entity/User.entity.js";

/**
 * Crée 3 utilisateurs (admin, teacher, student) avec des données aléatoires.
 */
export async function seedUsers(
	dataSource: DataSource,
	roles: Role[],
): Promise<User[]> {
	const repo = dataSource.getRepository(User);

	const adminRole = roles.find((r) => r.name === "admin");
	const teacherRole = roles.find((r) => r.name === "teacher");
	const studentRole = roles.find((r) => r.name === "student");

	if (!adminRole || !teacherRole || !studentRole) {
		throw new Error(
			"Certains rôles requis sont manquants pour le seed des utilisateurs.",
		);
	}

	faker.seed(3);

	const hashedPassword = await argon2.hash("Password123!", argon2Options);

	const usersSpecs = [
		{
			firstname: faker.person.firstName(),
			lastname: faker.person.lastName(),
			email: faker.internet.email(),
			password: hashedPassword,
			role: adminRole,
		},
		{
			firstname: faker.person.firstName(),
			lastname: faker.person.lastName(),
			email: faker.internet.email(),
			password: hashedPassword,
			role: teacherRole,
		},
		{
			firstname: faker.person.firstName(),
			lastname: faker.person.lastName(),
			email: faker.internet.email(),
			password: hashedPassword,
			role: studentRole,
		},
	];

	const users: User[] = [];
	for (const spec of usersSpecs) {
		let user = await repo.findOne({
			where: { email: spec.email },
			relations: { role: true },
		});
		if (!user) {
			user = repo.create(spec);
			await repo.save(user);
		}
		users.push(user);
	}

	return users;
}
