import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { Classroom } from "./Classroom.entity.js";
import { User } from "./User.entity.js";

// Une Série est une demande de réservation répétée chaque semaine :
// même salle, même jour, même créneau, sur une plage de semaines.
@Entity({ name: "booking_series" })
export class BookingSeries {
	@PrimaryGeneratedColumn({ type: "bigint" })
	id!: number;

	@Column({ type: "varchar", length: 100 })
	title!: string;

	// Personne qui a créé la série
	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: "user_id" })
	user!: User;

	// Bénéficiaire : personne pour qui la série est faite
	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: "reserved_for_user_id" })
	reservedForUser!: User;

	// Salle principale : la salle choisie au moment de créer la série
	@ManyToOne(() => Classroom, { nullable: false })
	@JoinColumn({ name: "classroom_id" })
	classroom!: Classroom;

	// Jour de la semaine : 1 = lundi, 2 = mardi, ..., 7 = dimanche
	@Column({ type: "tinyint" })
	day_of_week!: number;

	// Heure de début et de fin du créneau, à l'heure de Paris (ex. : "10:00:00")
	@Column({ type: "time" })
	start_time!: string;

	@Column({ type: "time" })
	end_time!: string;

	// Plage de semaines : du lundi de la première semaine
	// au dimanche de la dernière semaine (ex. : "2026-11-02")
	@Column({ type: "date" })
	start_date!: string;

	@Column({ type: "date" })
	end_date!: string;

	@Column({ type: "datetime" })
	created_at!: Date;
}
