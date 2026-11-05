import { DateTime } from "luxon";

// Les cours ont lieu à l'heure de Paris. Grâce à ce fuseau horaire,
// un cours de 10h-12h reste à 10h-12h après le changement d'heure.
const PARIS_TIME_ZONE = "Europe/Paris";

// Une série ne peut pas durer plus de 52 semaines (environ un an)
const MAX_WEEKS = 52;

// Les informations nécessaires pour calculer les dates d'une série
export interface SeriesSchedule {
	startDate: string; // lundi de la première semaine, ex. : "2026-11-02"
	endDate: string; // dimanche de la dernière semaine, ex. : "2027-01-03"
	dayOfWeek: number; // 1 = lundi, 2 = mardi, ..., 7 = dimanche
	startTime: string; // heure de début à Paris, ex. : "10:00"
	endTime: string; // heure de fin à Paris, ex. : "12:00"
}

// Une occurrence = un cours de la série
export interface Occurrence {
	start_at: Date; // date et heure de début du cours
	end_at: Date; // date et heure de fin du cours
}

// Assemble un jour et une heure "HH:mm" en une Date, à l'heure de Paris.
// Ex. : mardi 3 novembre 2026 + "10:00" → le 3 novembre 2026 à 10h (Paris)
function atParisTime(day: DateTime, time: string): Date {
	return DateTime.fromISO(`${day.toISODate()}T${time}`, {
		zone: PARIS_TIME_ZONE,
	}).toJSDate();
}

/**
 * Calcule une occurrence par semaine, de startDate à endDate,
 * puis garde seulement celles qui n'ont pas encore commencé.
 * Lance une erreur si les paramètres ne sont pas valides
 * ou s'il ne reste aucune occurrence à réserver.
 */
export function computeOccurrences(
	schedule: SeriesSchedule,
	now: Date,
): Occurrence[] {
	// Au format "HH:mm", les heures se comparent comme du texte : "09:00" < "10:00"
	if (schedule.endTime <= schedule.startTime) {
		throw new Error("L'heure de fin doit être après l'heure de début");
	}

	// 1. Calcule le jour du cours, semaine après semaine
	const lastDay = DateTime.fromISO(schedule.endDate);
	let courseDay = DateTime.fromISO(schedule.startDate).plus({
		// Ex. : cours le mercredi (3) → lundi 19 + 2 jours = mercredi 21.
		// On ajoute 3 - 1 = 2 jours, car on part déjà du lundi (jour 1).
		days: schedule.dayOfWeek - 1,
	});
	const allOccurrences: Occurrence[] = [];

	while (courseDay <= lastDay) {
		allOccurrences.push({
			start_at: atParisTime(courseDay, schedule.startTime),
			end_at: atParisTime(courseDay, schedule.endTime),
		});
		courseDay = courseDay.plus({ weeks: 1 });
	}

	// 2. Une occurrence par semaine : on vérifie le nombre de semaines
	if (allOccurrences.length > MAX_WEEKS) {
		throw new Error(`Une série ne peut pas dépasser ${MAX_WEEKS} semaines`);
	}

	// 3. On garde seulement les occurrences qui n'ont pas encore commencé
	const upcomingOccurrences = allOccurrences.filter(
		(occurrence) => occurrence.start_at > now,
	);

	if (upcomingOccurrences.length === 0) {
		throw new Error("Aucune occurrence à venir dans cette plage de semaines");
	}

	return upcomingOccurrences;
}

/**
 * Calcule le créneau d'une série à une date précise, à l'heure de Paris.
 * Sert à chercher une salle de remplacement pour une occurrence en échec.
 * Lance une erreur si la date n'est pas une occurrence de la série
 * ou si le cours a déjà commencé.
 *
 * @param schedule - les informations de la série (jour, heures, plage de semaines)
 * @param date - la date demandée au format "AAAA-MM-JJ", ex. : "2026-11-10"
 * @param now - la date et l'heure actuelles
 * @returns le début et la fin du cours ce jour-là
 */
export function computeOccurrenceOnDate(
	schedule: SeriesSchedule,
	date: string,
	now: Date,
): Occurrence {
	const day = DateTime.fromISO(date);

	// 1. La date doit tomber le jour de la série (ex. : un mardi).
	// Pour Luxon aussi, 1 = lundi, 2 = mardi, ..., 7 = dimanche.
	if (day.weekday !== schedule.dayOfWeek) {
		throw new Error("La date ne tombe pas le jour de la série");
	}

	// 2. La date doit être dans la plage de semaines.
	// Au format "AAAA-MM-JJ", les dates se comparent comme du texte.
	if (date < schedule.startDate || date > schedule.endDate) {
		throw new Error(
			"La date est en dehors de la plage de semaines de la série",
		);
	}

	const occurrence: Occurrence = {
		start_at: atParisTime(day, schedule.startTime),
		end_at: atParisTime(day, schedule.endTime),
	};

	// 3. On ne peut plus réserver un cours qui a déjà commencé
	if (occurrence.start_at <= now) {
		throw new Error("Cette occurrence a déjà commencé");
	}

	return occurrence;
}
