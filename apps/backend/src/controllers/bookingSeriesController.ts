import type { Response } from "express";
import { addBookingSeriesOccurrencesSchema } from "../dtos/addBookingSeriesOccurrences.dto.js";
import { createBookingSeriesSchema } from "../dtos/createBookingSeries.dto.js";
import { getReplacementClassroomsSchema } from "../dtos/getReplacementClassrooms.dto.js";
import type { BookingSeries } from "../entity/BookingSeries.entity.js";
import type { AuthRequest } from "../middleware/authenticate.js";
import { BookingSeriesService } from "../services/bookingSeriesService.js";

/**
 * Indique si la personne connectée a le droit de gérer une série :
 * seuls son auteur et les administrateurs ont ce droit.
 *
 * @param series - la série, chargée avec son auteur
 * @param req - la requête, avec l'ID et le rôle de la personne connectée
 * @returns true si la personne est l'auteur de la série ou un administrateur
 */
function isAuthorOrAdmin(series: BookingSeries, req: AuthRequest): boolean {
	// Number() : les id bigint arrivent sous forme de texte ("2")
	const isAuthor = Number(series.user.id) === Number(req.userId);
	return isAuthor || req.role === "admin";
}

export class BookingSeriesController {
	async create(req: AuthRequest, res: Response) {
		const result = createBookingSeriesSchema.safeParse(req.body);

		if (!result.success) {
			return res.status(400).json({
				message: "Failed to validate request",
				error: result.error.issues,
			});
		}

		const seriesData = result.data;
		const userId = req.userId;

		if (userId === undefined) {
			return res.status(401).json({ message: "Utilisateur non authentifié" });
		}

		// Un formateur ne peut réserver que pour lui-même.
		// Number() est obligatoire : l'id rangé dans le token est un texte ("2"),
		// car la base de données renvoie les colonnes bigint sous forme de texte.
		if (
			req.role === "teacher" &&
			seriesData.reservedForUserId !== Number(userId)
		) {
			return res
				.status(403)
				.json({ message: "Un formateur ne peut réserver que pour lui-même" });
		}

		try {
			const bookingSeriesService = new BookingSeriesService();
			const report = await bookingSeriesService.create(seriesData, userId);

			// Rapport de série : la série, les réservations obtenues
			// et les occurrences en échec avec leur motif
			return res.status(201).json({
				series: report.series,
				booked: report.booked.map((booking) => ({
					id: booking.id,
					start_at: booking.start_at,
					end_at: booking.end_at,
				})),
				failed: report.failed,
			});
		} catch (error) {
			return res.status(400).json({ message: (error as Error).message });
		}
	}

	/**
	 * GET /api/get-replacement-classrooms/:seriesId?date=AAAA-MM-JJ
	 * Renvoie les salles libres qui peuvent remplacer la salle principale
	 * d'une série à une date donnée.
	 *
	 * @param req - la requête, avec l'ID de la série dans l'URL et la date en paramètre
	 * @param res - la réponse : 200 avec les salles, ou 400 / 403 / 404
	 */
	async getReplacementClassrooms(req: AuthRequest, res: Response) {
		const result = getReplacementClassroomsSchema.safeParse({
			seriesId: req.params.seriesId,
			date: req.query.date,
		});

		if (!result.success) {
			return res.status(400).json({
				message: "Failed to validate request",
				error: result.error.issues,
			});
		}

		const { seriesId, date } = result.data;

		try {
			const bookingSeriesService = new BookingSeriesService();
			const series = await bookingSeriesService.findById(seriesId);

			if (!series) {
				return res.status(404).json({ message: "Série introuvable" });
			}

			// Seul l'auteur de la série ou un administrateur peut chercher
			// une salle de remplacement.
			if (!isAuthorOrAdmin(series, req)) {
				return res.status(403).json({
					message:
						"Seul l'auteur de la série ou un administrateur peut chercher une salle de remplacement",
				});
			}

			const classrooms = await bookingSeriesService.getReplacementClassrooms(
				series,
				date,
			);
			return res.status(200).json({ classrooms });
		} catch (error) {
			// Ex. : la date ne tombe pas le jour de la série
			return res.status(400).json({ message: (error as Error).message });
		}
	}

	/**
	 * POST /api/add-booking-series-occurrences/:seriesId
	 * Réserve des occurrences en échec d'une série, chacune dans la salle choisie.
	 * Corps : [{ "date": "AAAA-MM-JJ", "classroomId": 4 }, ...]
	 *
	 * @param req - la requête, avec l'ID de la série dans l'URL et la liste dans le corps
	 * @param res - la réponse : 201 avec le rapport de série, ou 400 / 401 / 403 / 404
	 */
	async addOccurrences(req: AuthRequest, res: Response) {
		const result = addBookingSeriesOccurrencesSchema.safeParse({
			seriesId: req.params.seriesId,
			occurrences: req.body,
		});

		if (!result.success) {
			return res.status(400).json({
				message: "Failed to validate request",
				error: result.error.issues,
			});
		}

		const { seriesId, occurrences } = result.data;
		const userId = req.userId;

		if (userId === undefined) {
			return res.status(401).json({ message: "Utilisateur non authentifié" });
		}

		try {
			const bookingSeriesService = new BookingSeriesService();
			const series = await bookingSeriesService.findById(seriesId);

			if (!series) {
				return res.status(404).json({ message: "Série introuvable" });
			}

			// Seul l'auteur de la série ou un administrateur peut réserver
			// ses occurrences en échec.
			if (!isAuthorOrAdmin(series, req)) {
				return res.status(403).json({
					message:
						"Seul l'auteur de la série ou un administrateur peut réserver ses occurrences",
				});
			}

			const report = await bookingSeriesService.addOccurrences(
				series,
				occurrences,
				userId,
			);

			// Même format que le rapport de création de série.
			// La série est recopiée champ par champ : series.user contient
			// le mot de passe haché de l'auteur, il ne doit pas partir dans la réponse.
			return res.status(201).json({
				series: {
					id: report.series.id,
					title: report.series.title,
					day_of_week: report.series.day_of_week,
					start_time: report.series.start_time,
					end_time: report.series.end_time,
					start_date: report.series.start_date,
					end_date: report.series.end_date,
					created_at: report.series.created_at,
				},
				booked: report.booked.map((booking) => ({
					id: booking.id,
					start_at: booking.start_at,
					end_at: booking.end_at,
				})),
				failed: report.failed,
			});
		} catch (error) {
			// Ex. : une date ne tombe pas le jour de la série, ou une salle n'existe pas
			return res.status(400).json({ message: (error as Error).message });
		}
	}
}
