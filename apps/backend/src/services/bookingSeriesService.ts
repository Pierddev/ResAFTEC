import { LessThan, MoreThan } from "typeorm";
import { AppDataSource } from "../database/data-source.js";
import type { createBookingSeriesDto } from "../dtos/createBookingSeries.dto.js";
import { Booking } from "../entity/Booking.entity.js";
import { BookingSeries } from "../entity/BookingSeries.entity.js";
import { Classroom } from "../entity/Classroom.entity.js";
import { ClassroomDisablement } from "../entity/ClassroomDisablement.entity.js";
import { User } from "../entity/User.entity.js";
import {
	computeOccurrences,
	type Occurrence,
} from "../utils/computeOccurrences.js";

// Motif d'une occurrence en échec :
// - "already_booked" : la salle est déjà réservée sur ce créneau
// - "disabled" : la salle est désactivée sur ce créneau
export type FailureReason = "already_booked" | "disabled";

// Occurrence qui n'a pas pu être réservée, avec son motif
export interface FailedOccurrence {
	date: Date;
	reason: FailureReason;
}

export class BookingSeriesService {
	// Renvoie le motif si la salle n'est pas libre pendant l'occurrence,
	// ou null si elle est libre
	async getFailureReason(
		classroomId: number,
		occurrence: Occurrence,
	): Promise<FailureReason | null> {
		// Même condition de chevauchement que pour une réservation simple :
		// un créneau existant commence avant la fin ET finit après le début
		const overlap = {
			classroom: { id: classroomId },
			start_at: LessThan(occurrence.end_at),
			end_at: MoreThan(occurrence.start_at),
		};

		const bookingRepository = AppDataSource.getRepository(Booking);
		const existingBooking = await bookingRepository.findOne({ where: overlap });
		if (existingBooking) {
			return "already_booked";
		}

		const disablementRepository =
			AppDataSource.getRepository(ClassroomDisablement);
		const disablement = await disablementRepository.findOne({ where: overlap });
		if (disablement) {
			return "disabled";
		}

		return null;
	}

	async create(dto: createBookingSeriesDto, userId: number) {
		const classroomRepository = AppDataSource.getRepository(Classroom);
		const userRepository = AppDataSource.getRepository(User);

		const existingClassroom = await classroomRepository.findOneBy({
			id: dto.classroomId,
		});
		if (!existingClassroom) {
			throw new Error("L'ID de la salle n'existe pas.");
		}

		const existingUser = await userRepository.findOneBy({
			id: dto.reservedForUserId,
		});
		if (!existingUser) {
			throw new Error("L'ID de l'utilisateur n'existe pas");
		}

		// 1. Calcule les dates de la série
		// (lance une erreur si les paramètres ne sont pas valides)
		const occurrences = computeOccurrences(dto, new Date());

		// 2. Trie les occurrences : libres d'un côté, en échec de l'autre
		const freeOccurrences: Occurrence[] = [];
		const failed: FailedOccurrence[] = [];

		for (const occurrence of occurrences) {
			const reason = await this.getFailureReason(dto.classroomId, occurrence);
			if (reason === null) {
				freeOccurrences.push(occurrence);
			} else {
				failed.push({ date: occurrence.start_at, reason });
			}
		}

		// 3. Enregistre la série et ses réservations dans une transaction :
		// si une seule sauvegarde échoue, rien n'est enregistré.
		// La série est enregistrée même si toutes les occurrences sont en échec.
		return await AppDataSource.transaction(async (manager) => {
			const seriesRepository = manager.getRepository(BookingSeries);
			const bookingRepository = manager.getRepository(Booking);

			const series = seriesRepository.create({
				title: dto.title,
				user: { id: userId },
				reservedForUser: { id: dto.reservedForUserId },
				classroom: { id: dto.classroomId },
				day_of_week: dto.dayOfWeek,
				start_time: dto.startTime,
				end_time: dto.endTime,
				start_date: dto.startDate,
				end_date: dto.endDate,
				created_at: new Date(),
			});
			await seriesRepository.save(series);

			// Une réservation par occurrence libre, rattachée à la série
			const booked = freeOccurrences.map((occurrence) =>
				bookingRepository.create({
					title: dto.title,
					user: { id: userId },
					reservedForUser: { id: dto.reservedForUserId },
					classroom: { id: dto.classroomId },
					series: series,
					created_at: new Date(),
					start_at: occurrence.start_at,
					end_at: occurrence.end_at,
				}),
			);
			await bookingRepository.save(booked);

			return { series, booked, failed };
		});
	}
}
