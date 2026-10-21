import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	type Relation,
} from "typeorm";
import { Role } from "./Role.entity.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: L'identifiant de l'utilisateur
 *         firstname:
 *           type: string
 *           description: Le prénom de l'utilisateur
 *         lastname:
 *           type: string
 *           description: Le nom de l'utilisateur
 *         email:
 *           type: string
 *           format: email
 *           description: L'adresse e-mail de l'utilisateur
 *         role:
 *           $ref: '#/components/schemas/Role'
 */
@Entity({ name: "user" })
export class User {
	@PrimaryGeneratedColumn({ type: "bigint" })
	id!: number;

	@Column({ type: "varchar", length: 50 })
	firstname!: string;

	@Column({ type: "varchar", length: 50 })
	lastname!: string;

	@Column({ type: "varchar", length: 128, unique: true })
	email!: string;

	@Column({ type: "varchar", length: 255 })
	password!: string;

	// Relation<Role> est exactement le même type que Role. Il évite l'erreur
	// "Cannot access 'Role' before initialization" quand Role.entity.ts est
	// chargé avant ce fichier : Role et User s'importent l'un l'autre.
	@ManyToOne(
		() => Role,
		(role) => role.users,
		{ nullable: false },
	)
	@JoinColumn({ name: "role_id" })
	role!: Relation<Role>;
}
