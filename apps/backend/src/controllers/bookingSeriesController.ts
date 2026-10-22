import type { Response } from "express";
import { createBookingSeriesSchema } from "../dtos/createBookingSeries.dto.js";
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
}
