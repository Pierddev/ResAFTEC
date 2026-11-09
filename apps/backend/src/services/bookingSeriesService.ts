import { LessThan, MoreThan, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../database/data-source.js";
import type { occurrenceToBookDto } from "../dtos/addBookingSeriesOccurrences.dto.js";
import type { createBookingSeriesDto } from "../dtos/createBookingSeries.dto.js";
import { Booking } from "../entity/Booking.entity.js";
import { BookingSeries } from "../entity/BookingSeries.entity.js";
import { Classroom } from "../entity/Classroom.entity.js";
import { ClassroomDisablement } from "../entity/ClassroomDisablement.entity.js";
import { User } from "../entity/User.entity.js";
import {
	computeOccurrenceOnDate,
	computeOccurrences,
	type Occurrence,
	type SeriesSchedule,
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

// Occurrence libre, avec la salle dans laquelle on va la réserver
interface FreeOccurrence {
	classroomId: number;
	occurrence: Occurrence;
}

/**
 * Rassemble les informations d'une série dont computeOccurrenceOnDate
 * a besoin : jour de la semaine, heures et plage de semaines.
 *
 * @param series - la série enregistrée en base
 * @returns le jour, les heures et la plage de semaines de la série
 */
function getSchedule(series: BookingSeries): SeriesSchedule {
	return {
		startDate: series.start_date,
		endDate: series.end_date,
		dayOfWeek: series.day_of_week,
		startTime: series.start_time,
		endTime: series.end_time,
	};
}

/**
 * Indique à quelle distance une salle se trouve de la salle principale.
 * Plus le nombre est petit, plus la salle est proche.
 *
 * @param classroom - la salle à classer (avec son étage et son bâtiment)
 * @param mainClassroom - la salle principale de la série
 * @returns 0 = même étage, 1 = même bâtiment, 2 = autre bâtiment
 */
function getDistance(classroom: Classroom, mainClassroom: Classroom): number {
	if (classroom.floor.id === mainClassroom.floor.id) {
		return 0;
	}
	if (classroom.floor.building.id === mainClassroom.floor.building.id) {
		return 1;
	}
	return 2;
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

	/**
	 * Récupère une série avec son auteur, son bénéficiaire et sa salle
	 * principale (avec l'étage et le bâtiment de la salle).
	 *
	 * @param seriesId - l'identifiant de la série
	 * @returns la série, ou null si elle n'existe pas
	 */
	async findById(seriesId: number): Promise<BookingSeries | null> {
		const seriesRepository = AppDataSource.getRepository(BookingSeries);
		return await seriesRepository.findOne({
			where: { id: seriesId },
			relations: {
				user: true,
				reservedForUser: true,
				classroom: { floor: { building: true } },
			},
		});
	}

	/**
	 * Cherche les salles de remplacement d'une série à une date donnée :
	 * les autres salles libres sur le même créneau, au moins aussi grandes
	 * que la salle principale, de la plus proche à la plus éloignée.
	 * Lance une erreur si la date n'est pas une occurrence à venir de la série.
	 *
	 * @param series - la série, chargée avec findById
	 * @param date - la date de l'occurrence en échec, ex. : "2026-11-10"
	 * @returns les salles libres, triées par proximité puis par nom
	 */
	async getReplacementClassrooms(
		series: BookingSeries,
		date: string,
	): Promise<Classroom[]> {
		const mainClassroom = series.classroom;

		// 1. Calcule le créneau de la série ce jour-là, à l'heure de Paris
		const occurrence = computeOccurrenceOnDate(
			getSchedule(series),
			date,
			new Date(),
		);

		// 2. Récupère les salles au moins aussi grandes que la salle principale
		const classroomRepository = AppDataSource.getRepository(Classroom);
		const bigEnoughClassrooms = await classroomRepository.find({
			where: { capacity: MoreThanOrEqual(mainClassroom.capacity) },
			relations: { floor: { building: true } },
		});

		// 3. Garde seulement les salles libres sur ce créneau,
		// sauf la salle principale (c'est elle qui n'est pas disponible)
		const freeClassrooms: Classroom[] = [];
		for (const classroom of bigEnoughClassrooms) {
			if (classroom.id === mainClassroom.id) {
				continue;
			}
			const reason = await this.getFailureReason(classroom.id, occurrence);
			if (reason === null) {
				freeClassrooms.push(classroom);
			}
		}

		// 4. Trie de la plus proche à la plus éloignée.
		// À distance égale, on trie par nom (ex. : "B102" avant "B103").
		freeClassrooms.sort((a, b) => {
			const distanceA = getDistance(a, mainClassroom);
			const distanceB = getDistance(b, mainClassroom);
			if (distanceA !== distanceB) {
				return distanceA - distanceB;
			}
			return a.name.localeCompare(b.name);
		});

		return freeClassrooms;
	}

	/**
	 * Réserve des occurrences en échec d'une série, chacune dans la salle
	 * choisie (souvent une salle de remplacement).
	 * Le titre, le bénéficiaire et le créneau sont repris de la série,
	 * et chaque réservation obtenue est rattachée à la série.
	 * Lance une erreur, sans rien réserver, si une date n'est pas une
	 * occurrence à venir de la série ou si une salle n'existe pas.
	 *
	 * @param series - la série, chargée avec findById
	 * @param occurrencesToBook - les dates à réserver, avec la salle choisie pour chacune
	 * @param userId - l'ID de la personne connectée, auteur des réservations
	 * @returns le rapport : la série, les réservations obtenues et les occurrences en échec
	 */
	async addOccurrences(
		series: BookingSeries,
		occurrencesToBook: occurrenceToBookDto[],
		userId: number,
	) {
		const classroomRepository = AppDataSource.getRepository(Classroom);
		const schedule = getSchedule(series);
		const now = new Date();

		// 1. Vérifie chaque date : libres d'un côté, en échec de l'autre
		const freeOccurrences: FreeOccurrence[] = [];
		const failed: FailedOccurrence[] = [];

		for (const occurrenceToBook of occurrencesToBook) {
			// Calcule le créneau de la série ce jour-là, à l'heure de Paris.
			// Lance une erreur si la date n'est pas une occurrence à venir de la série.
			const occurrence = computeOccurrenceOnDate(
				schedule,
				occurrenceToBook.date,
				now,
			);

			const classroom = await classroomRepository.findOneBy({
				id: occurrenceToBook.classroomId,
			});
			if (!classroom) {
				throw new Error(
					`La salle ${occurrenceToBook.classroomId} n'existe pas.`,
				);
			}

			// Mêmes vérifications que pour créer la série : réservation ou désactivation.
			// La salle de remplacement a pu être prise entre-temps.
			const reason = await this.getFailureReason(
				occurrenceToBook.classroomId,
				occurrence,
			);
			if (reason === null) {
				freeOccurrences.push({
					classroomId: occurrenceToBook.classroomId,
					occurrence: occurrence,
				});
			} else {
				failed.push({ date: occurrence.start_at, reason });
			}
		}

		// 2. Enregistre les réservations dans une transaction :
		// si une seule sauvegarde échoue, rien n'est enregistré.
		return await AppDataSource.transaction(async (manager) => {
			const bookingRepository = manager.getRepository(Booking);

			const booked = freeOccurrences.map((freeOccurrence) =>
				bookingRepository.create({
					title: series.title,
					user: { id: userId },
					reservedForUser: { id: series.reservedForUser.id },
					// La salle choisie, même si ce n'est pas la salle principale
					classroom: { id: freeOccurrence.classroomId },
					// Rattache la réservation à la série (seul l'ID est utile)
					series: { id: series.id },
					created_at: new Date(),
					start_at: freeOccurrence.occurrence.start_at,
					end_at: freeOccurrence.occurrence.end_at,
				}),
			);
			await bookingRepository.save(booked);

			return { series, booked, failed };
		});
	}
}
