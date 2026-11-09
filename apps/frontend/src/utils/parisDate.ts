// Les cours ont lieu à l'heure de Paris, mais l'API renvoie les dates en UTC
// (le "Z" à la fin, ex. : "2027-03-30T08:00:00.000Z" = 10h à Paris en été).
const PARIS_TIME_ZONE = "Europe/Paris";

/**
 * Donne la date d'un cours à Paris, au format "AAAA-MM-JJ" attendu par l'API
 * (ex. : pour chercher une salle de remplacement ce jour-là).
 *
 * On ne peut pas garder seulement les 10 premiers caractères de la date UTC :
 * un cours qui commence à 00h30 à Paris commence la veille à 22h30 en UTC.
 *
 * @param date - le début du cours en UTC, ex. : "2027-03-30T08:00:00.000Z"
 * @returns la date du cours à Paris, ex. : "2027-03-30"
 */
export function toParisIsoDate(date: string): string {
	// toLocaleDateString donne la date à Paris au format français : "30/03/2027"
	const frenchDate = new Date(date).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: PARIS_TIME_ZONE,
	});

	// On découpe "30/03/2027" en ["30", "03", "2027"],
	// puis on remet les morceaux dans l'ordre de l'API : année, mois, jour
	const [day, month, year] = frenchDate.split("/");
	return `${year}-${month}-${day}`;
}
