import { z } from "zod";

const seriesIdMessage = "L'ID de la série doit être un nombre entier positif";

// Vérifie les paramètres de la recherche de salles de remplacement :
// GET /api/get-replacement-classrooms/:seriesId?date=AAAA-MM-JJ
// Le jour, la plage de semaines et l'heure sont vérifiés ensuite
// par computeOccurrenceOnDate.
export const getReplacementClassroomsSchema = z.object({
	// L'ID arrive dans l'URL, donc sous forme de texte : "7".
	// z.coerce.number() le transforme en nombre : 7.
	seriesId: z.coerce
		.number({ message: seriesIdMessage })
		.int(seriesIdMessage)
		.positive(seriesIdMessage),
	// Date de l'occurrence en échec, ex. : "2026-11-10"
	date: z.iso.date({ message: "La date doit être au format AAAA-MM-JJ" }),
});

export type getReplacementClassroomsDto = z.infer<
	typeof getReplacementClassroomsSchema
>;
