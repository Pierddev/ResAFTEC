// Calculs sur les semaines ISO (norme ISO 8601), utilisées pour les séries de réservations.
// - Une semaine commence le lundi et finit le dimanche.
// - La semaine 1 est celle qui contient le 4 janvier : elle peut donc commencer en décembre.
// - Une année compte 52 semaines, parfois 53.
//
// Toutes les dates sont calculées à minuit UTC : en UTC, il n'y a pas de changement
// d'heure, donc une journée dure toujours exactement 24 heures.

// Nombre de millisecondes dans une journée
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Ajoute un nombre de jours à une date.
 *
 * @param date - la date de départ (à minuit UTC)
 * @param days - le nombre de jours à ajouter
 * @returns une nouvelle date, la date de départ n'est pas modifiée
 */
function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * ONE_DAY);
}

/**
 * Donne le numéro du jour de la semaine d'une date, en commençant par le lundi.
 *
 * @param date - une date à minuit UTC
 * @returns 1 = lundi, 2 = mardi, ..., 7 = dimanche
 */
function getDayNumber(date: Date): number {
	// getUTCDay() renvoie 0 pour dimanche, 1 pour lundi, ..., 6 pour samedi.
	// On remplace 0 par 7 pour avoir 1 = lundi, ..., 7 = dimanche.
	const day = date.getUTCDay();
	if (day === 0) {
		return 7;
	}
	return day;
}

// Une semaine ISO : son numéro et son année, ex. : { week: 46, year: 2026 }
export interface IsoWeek {
	week: number;
	year: number;
}

/**
 * Calcule le lundi d'une semaine ISO.
 *
 * @param week - le numéro de la semaine, ex. : 12
 * @param year - l'année de la semaine, ex. : 2027
 * @returns le lundi de la semaine à minuit UTC, ex. : 22 mars 2027
 */
export function getMondayOfIsoWeek(week: number, year: number): Date {
	// Le 4 janvier est toujours dans la semaine 1.
	// Date.UTC compte les mois à partir de 0 : 0 = janvier.
	const january4 = new Date(Date.UTC(year, 0, 4));
	const dayOfWeek = getDayNumber(january4);

	// Lundi de la semaine 1 : on recule du 4 janvier jusqu'au lundi.
	// Ex. : le 4 janvier 2026 est un dimanche (7) → on recule de 6 jours → lundi 29 décembre 2025
	const mondayOfWeek1 = addDays(january4, -(dayOfWeek - 1));

	// Lundi de la semaine demandée : on avance d'une semaine (7 jours) par semaine
	return addDays(mondayOfWeek1, (week - 1) * 7);
}

/**
 * Calcule le dimanche d'une semaine ISO.
 *
 * @param week - le numéro de la semaine, ex. : 12
 * @param year - l'année de la semaine, ex. : 2027
 * @returns le dimanche de la semaine à minuit UTC, ex. : 28 mars 2027
 */
export function getSundayOfIsoWeek(week: number, year: number): Date {
	// Le dimanche est 6 jours après le lundi
	return addDays(getMondayOfIsoWeek(week, year), 6);
}

/**
 * Indique si une semaine existe dans une année.
 * La semaine 53 n'existe pas toutes les années (ex. : elle existe en 2026, pas en 2027).
 *
 * @param week - le numéro de la semaine saisi dans le formulaire
 * @param year - l'année saisie dans le formulaire
 * @returns true si la semaine existe, sinon false
 */
export function isValidIsoWeek(week: number, year: number): boolean {
	// Un champ vide ou un nombre à virgule n'est pas une semaine
	if (!Number.isInteger(week) || !Number.isInteger(year)) {
		return false;
	}

	if (week < 1 || week > 53) {
		return false;
	}

	// Une semaine appartient à l'année de son jeudi.
	// Ex. : la semaine 53 de 2027 aurait son jeudi le 6 janvier 2028,
	// c'est en fait la semaine 1 de 2028 : elle n'existe donc pas en 2027.
	const thursday = addDays(getMondayOfIsoWeek(week, year), 3);
	return thursday.getUTCFullYear() === year;
}

/**
 * Donne le nombre de semaines d'une année : 52, ou 53 certaines années.
 *
 * @param year - l'année, ex. : 2026
 * @returns 53 si la semaine 53 existe cette année-là, sinon 52
 */
export function getWeeksInYear(year: number): number {
	if (isValidIsoWeek(53, year)) {
		return 53;
	}
	return 52;
}

/**
 * Trouve la semaine ISO d'une date, ex. : la semaine actuelle à partir de la date du jour.
 *
 * @param date - la date, à l'heure de l'utilisateur
 * @returns la semaine et son année, ex. : { week: 46, year: 2026 } pour le 9 novembre 2026
 */
export function getIsoWeek(date: Date): IsoWeek {
	// On garde seulement le jour de la date (heure de l'utilisateur),
	// recopié à minuit UTC comme toutes les dates de ce fichier
	const day = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);

	// Une semaine appartient à l'année de son jeudi : on cherche le jeudi de la même semaine.
	// Ex. : vendredi 1er janvier 2027 (jour 5) → on recule d'1 jour → jeudi 31 décembre 2026,
	// donc le 1er janvier 2027 est dans une semaine de 2026 (la semaine 53).
	const thursday = addDays(day, 4 - getDayNumber(day));
	const year = thursday.getUTCFullYear();

	// Numéro de la semaine : nombre de semaines entre le jeudi de la semaine 1 et ce jeudi, plus 1
	const thursdayOfWeek1 = addDays(getMondayOfIsoWeek(1, year), 3);
	const daysBetween =
		(thursday.getTime() - thursdayOfWeek1.getTime()) / ONE_DAY;
	const week = daysBetween / 7 + 1;

	return { week, year };
}

/**
 * Corrige une semaine qui sort de son année, après un clic sur + ou − dans le formulaire :
 * - après la dernière semaine, on passe à la semaine 1 de l'année suivante ;
 * - avant la semaine 1, on passe à la dernière semaine de l'année précédente.
 *
 * @param week - le numéro de semaine saisi, ex. : 54
 * @param year - l'année saisie, ex. : 2026
 * @returns la semaine corrigée, ex. : (54, 2026) → { week: 1, year: 2027 }
 */
export function normalizeIsoWeek(week: number, year: number): IsoWeek {
	if (week < 1) {
		return { week: getWeeksInYear(year - 1), year: year - 1 };
	}
	if (week > getWeeksInYear(year)) {
		return { week: 1, year: year + 1 };
	}
	return { week, year };
}

/**
 * Indique si une semaine est avant une autre.
 *
 * @param first - la première semaine, ex. : { week: 50, year: 2026 }
 * @param second - la deuxième semaine, ex. : { week: 2, year: 2027 }
 * @returns true si la première semaine est avant la deuxième (false si c'est la même)
 */
export function isWeekBefore(first: IsoWeek, second: IsoWeek): boolean {
	// D'abord l'année, puis le numéro de semaine si l'année est la même
	if (first.year !== second.year) {
		return first.year < second.year;
	}
	return first.week < second.week;
}

/**
 * Transforme une date en texte au format "AAAA-MM-JJ", le format attendu par l'API.
 *
 * @param date - une date à minuit UTC
 * @returns la date au format "AAAA-MM-JJ", ex. : "2027-03-22"
 */
export function toIsoDate(date: Date): string {
	// toISOString() renvoie "2027-03-22T00:00:00.000Z" : on garde les 10 premiers caractères
	return date.toISOString().slice(0, 10);
}

/**
 * Affiche le jour et le mois d'une date, ex. : "22/03".
 *
 * @param date - une date à minuit UTC
 * @returns le jour et le mois au format "JJ/MM"
 */
function formatDayMonth(date: Date): string {
	// timeZone "UTC" : la date est calculée en UTC, on l'affiche donc en UTC.
	// Sinon, un navigateur réglé sur un autre fuseau pourrait afficher la veille.
	return date.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "UTC",
	});
}

/**
 * Construit le texte affiché à côté d'une semaine choisie dans le formulaire.
 *
 * @param week - le numéro de la semaine, ex. : 12
 * @param year - l'année de la semaine, ex. : 2027
 * @returns le texte, ex. : "S12-2027 : du 22/03 au 28/03"
 */
export function formatWeekRange(week: number, year: number): string {
	const monday = formatDayMonth(getMondayOfIsoWeek(week, year));
	const sunday = formatDayMonth(getSundayOfIsoWeek(week, year));
	return `S${week}-${year} : du ${monday} au ${sunday}`;
}
