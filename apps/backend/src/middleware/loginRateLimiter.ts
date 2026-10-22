import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/**
 * Construit la "clé" qui identifie un compteur de tentatives :
 * l'adresse IP + l'email saisi.
 *
 * Pourquoi les deux ?
 * - avec l'IP seule, tous les étudiants connectés au wifi de l'école (même IP
 *   publique) partageraient le même compteur et se bloqueraient entre eux ;
 * - avec l'email seul, n'importe qui pourrait bloquer le compte d'un étudiant
 *   en tapant 10 mauvais mots de passe.
 *
 * @param req - la requête HTTP reçue sur POST /api/login
 * @returns la clé, par exemple "203.0.113.5-jean.dupont@example.com"
 */
function getLoginAttemptKey(req: Request): string {
	// ipKeyGenerator regroupe les adresses IPv6 d'un même réseau : sans ça,
	// un attaquant pourrait changer d'adresse IPv6 à chaque essai.
	const ip = ipKeyGenerator(req.ip ?? "");

	// On ne garde l'email que si c'est bien un texte (la requête peut être mal
	// formée). On le met en minuscules car la base de données ne fait pas la
	// différence entre "Jean@example.com" et "jean@example.com".
	let email = "";
	if (typeof req.body?.email === "string") {
		email = req.body.email.toLowerCase();
	}

	return `${ip}-${email}`;
}

/**
 * Middleware qui limite les tentatives de connexion ratées sur POST /api/login.
 *
 * Après 10 échecs en 1 heure pour un même couple IP + email, les tentatives
 * suivantes sont refusées avec le code HTTP 429 (Too Many Requests) jusqu'à
 * la fin de l'heure. Cela rend très lent le fait d'essayer des milliers de
 * mots de passe (attaque par "force brute").
 *
 * Les compteurs sont gardés en mémoire : ils sont remis à zéro quand le
 * serveur redémarre.
 */
export const loginRateLimiter = rateLimit({
	// Durée de la fenêtre : 1 heure, en millisecondes
	windowMs: 60 * 60 * 1000,
	// Nombre de tentatives ratées autorisées pendant cette heure
	limit: 10,
	// Les connexions réussies (code HTTP inférieur à 400) ne sont pas comptées
	skipSuccessfulRequests: true,
	keyGenerator: getLoginAttemptKey,
	// Ajoute l'en-tête "RateLimit" à la réponse (format standard actuel)
	// et désactive les anciens en-têtes "X-RateLimit-*"
	standardHeaders: "draft-8",
	legacyHeaders: false,
	// Même format { message } que les autres erreurs du login,
	// pour que le frontend puisse l'afficher
	message: { message: "Too many login attempts, please try again later." },
});
