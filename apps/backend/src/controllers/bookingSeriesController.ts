import type { Response } from "express";
import { createBookingSeriesSchema } from "../dtos/createBookingSeries.dto.js";
import { getReplacementClassroomsSchema } from "../dtos/getReplacementClassrooms.dto.js";
import type { AuthRequest } from "../middleware/authenticate.js";
import { BookingSeriesService } from "../services/bookingSeriesService.js";

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
			// Number() : les id bigint arrivent sous forme de texte ("2").
			const isAuthor = Number(series.user.id) === Number(req.userId);
			if (!isAuthor && req.role !== "admin") {
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
}
