import { z } from "zod";
import { MAX_WEEKS } from "../utils/computeOccurrences.js";

const seriesIdMessage = "L'ID de la série doit être un nombre entier positif";

// Une occurrence à réserver : sa date et la salle choisie pour ce jour-là
const occurrenceToBookSchema = z.object({
	// Date de l'occurrence en échec, ex. : "2026-11-10"
	date: z.iso.date({ message: "La date doit être au format AAAA-MM-JJ" }),
	// Salle choisie : souvent une salle de remplacement
	classroomId: z.number({ message: "La salle est obligatoire" }),
});

/**
 * Vérifie que chaque date n'apparaît qu'une seule fois dans la liste.
 * Sans cette règle, la même date pourrait être réservée deux fois.
 *
 * @param occurrences - les occurrences envoyées dans le corps de la requête
 * @returns true si toutes les dates sont différentes
 */
function hasNoDuplicateDate(occurrences: { date: string }[]): boolean {
	const dates = occurrences.map((occurrence) => occurrence.date);
	// Un Set ne garde qu'un exemplaire de chaque valeur :
	// s'il est plus petit que la liste, c'est qu'une date est en double
	return new Set(dates).size === dates.length;
}

// Vérifie les données envoyées pour réserver les occurrences en échec :
// POST /api/add-booking-series-occurrences/:seriesId
// avec dans le corps une liste : [{ date, classroomId }, ...]
// Le jour, la plage de semaines et l'heure sont vérifiés ensuite
// par computeOccurrenceOnDate.
export const addBookingSeriesOccurrencesSchema = z.object({
	// L'ID arrive dans l'URL, donc sous forme de texte : "7".
	// z.coerce.number() le transforme en nombre : 7.
	seriesId: z.coerce
		.number({ message: seriesIdMessage })
		.int(seriesIdMessage)
		.positive(seriesIdMessage),
	// Le corps de la requête : la liste des occurrences à réserver.
	// Une série a au plus une occurrence par semaine, donc 52 au maximum.
	occurrences: z
		.array(occurrenceToBookSchema, {
			message: "Le corps doit être une liste d'occurrences",
		})
		.min(1, "Il faut au moins une occurrence à réserver")
		.max(MAX_WEEKS, `Il ne peut pas y avoir plus de ${MAX_WEEKS} occurrences`)
		.refine(
			hasNoDuplicateDate,
			"Une date ne peut apparaître qu'une seule fois",
		),
});

export type addBookingSeriesOccurrencesDto = z.infer<
	typeof addBookingSeriesOccurrencesSchema
>;

// Type d'une occurrence à réserver : { date: string, classroomId: number }
export type occurrenceToBookDto = z.infer<typeof occurrenceToBookSchema>;
