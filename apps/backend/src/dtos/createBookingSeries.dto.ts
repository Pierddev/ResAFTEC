import { z } from "zod";

const dayOfWeekMessage =
	"Le jour de la semaine doit être un nombre entier entre 1 (lundi) et 7 (dimanche)";

// Vérifie le format des données envoyées pour créer une série.
// Les règles sur les dates (heure de fin après l'heure de début,
// 52 semaines maximum...) sont vérifiées ensuite par computeOccurrences.
export const createBookingSeriesSchema = z.object({
	title: z.string().min(1, "Le titre est obligatoire").max(100),
	classroomId: z.number({ message: "La salle est obligatoire" }),
	reservedForUserId: z.number({
		message: "La série doit être associée à un utilisateur",
	}),
	// Nombre entier : 1 = lundi, 2 = mardi, ..., 7 = dimanche
	dayOfWeek: z
		.int({ message: dayOfWeekMessage })
		.min(1, dayOfWeekMessage)
		.max(7, dayOfWeekMessage),
	// Heures au format "HH:mm", ex. : "10:00"
	// precision: -1 = heures et minutes seulement, sans les secondes
	startTime: z.iso.time({
		precision: -1,
		message: "L'heure de début doit être au format HH:mm",
	}),
	endTime: z.iso.time({
		precision: -1,
		message: "L'heure de fin doit être au format HH:mm",
	}),
	// Dates au format "AAAA-MM-JJ", ex. : "2026-11-02"
	startDate: z.iso.date({
		message: "La date de début doit être au format AAAA-MM-JJ",
	}),
	endDate: z.iso.date({
		message: "La date de fin doit être au format AAAA-MM-JJ",
	}),
});

export type createBookingSeriesDto = z.infer<typeof createBookingSeriesSchema>;
