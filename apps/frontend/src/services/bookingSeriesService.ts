import api from "./apiService";

// Données envoyées au backend pour créer une série de réservations
export interface CreateBookingSeriesData {
	title: string;
	classroomId: number;
	reservedForUserId: number; // le bénéficiaire des réservations
	dayOfWeek: number; // 1 = lundi, 2 = mardi, ..., 7 = dimanche
	startTime: string; // heure de début à Paris, ex. : "10:00"
	endTime: string; // heure de fin à Paris, ex. : "12:00"
	startDate: string; // lundi de la semaine de début, ex. : "2027-03-22"
	endDate: string; // dimanche de la semaine de fin, ex. : "2027-05-23"
}

// Motif d'une occurrence en échec :
// - "already_booked" : la salle est déjà réservée sur ce créneau
// - "disabled" : la salle est désactivée sur ce créneau
export type FailureReason = "already_booked" | "disabled";

// Occurrence qui n'a pas pu être réservée, avec son motif
export interface FailedOccurrence {
	date: string; // début du cours en UTC, ex. : "2027-03-23T09:00:00.000Z"
	reason: FailureReason;
}

// Réservation obtenue pour une occurrence de la série
export interface BookedOccurrence {
	id: number;
	start_at: string;
	end_at: string;
}

// Rapport de série renvoyé par le backend après la demande
export interface BookingSeriesReport {
	series: {
		id: number;
		title: string;
	};
	booked: BookedOccurrence[];
	failed: FailedOccurrence[];
}

// Salle de remplacement proposée pour une occurrence en échec,
// avec son étage et son bâtiment pour savoir où elle se trouve
export interface ReplacementClassroom {
	id: number;
	name: string;
	capacity: number;
	floor: {
		id: number;
		level: number;
		building: {
			id: number;
			name: string;
		};
	};
}

// Réponse du backend à la recherche de salles de remplacement
interface GetReplacementClassroomsResponse {
	classrooms: ReplacementClassroom[];
}

// Occurrence en échec à réserver, avec la salle choisie pour ce jour-là
export interface OccurrenceToBook {
	date: string; // date du cours à Paris, ex. : "2027-03-30"
	classroomId: number;
}

export const bookingSeriesService = {
	/**
	 * Crée une série de réservations : le backend réserve chaque occurrence libre
	 * et renvoie les occurrences en échec avec leur motif.
	 *
	 * @param data - les informations de la série saisies dans le formulaire
	 * @returns le rapport de série
	 */
	async create(data: CreateBookingSeriesData): Promise<BookingSeriesReport> {
		const response = await api.post<BookingSeriesReport>(
			"/create-booking-series",
			data,
		);
		return response.data;
	},

	/**
	 * Cherche les salles de remplacement d'une série à une date donnée :
	 * les salles libres sur le même créneau, de la plus proche à la plus éloignée.
	 *
	 * @param seriesId - l'id de la série
	 * @param date - la date de l'occurrence en échec à Paris, ex. : "2027-03-30"
	 * @returns les salles libres (liste vide si aucune salle ne convient)
	 */
	async getReplacementClassrooms(
		seriesId: number,
		date: string,
	): Promise<ReplacementClassroom[]> {
		const response = await api.get<GetReplacementClassroomsResponse>(
			`/get-replacement-classrooms/${seriesId}`,
			// params : axios ajoute "?date=2027-03-30" à la fin de l'adresse
			{ params: { date } },
		);
		return response.data.classrooms;
	},

	/**
	 * Réserve des occurrences en échec d'une série, chacune dans la salle choisie.
	 * Le backend renvoie un rapport de série pour ces dates : les réservations
	 * obtenues, et les dates encore en échec (une salle a pu être prise entre-temps).
	 *
	 * @param seriesId - l'id de la série
	 * @param occurrences - les dates à réserver, avec la salle choisie pour chacune
	 * @returns le rapport de série de ces dates
	 */
	async addOccurrences(
		seriesId: number,
		occurrences: OccurrenceToBook[],
	): Promise<BookingSeriesReport> {
		const response = await api.post<BookingSeriesReport>(
			`/add-booking-series-occurrences/${seriesId}`,
			occurrences,
		);
		return response.data;
	},
};
