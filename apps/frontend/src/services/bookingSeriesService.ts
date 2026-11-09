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
};
