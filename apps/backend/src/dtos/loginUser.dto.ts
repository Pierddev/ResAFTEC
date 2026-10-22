import { z } from "zod";

/**
 * Schéma de validation des données envoyées sur POST /api/login.
 *
 * Au login, on n'applique PAS les règles de création du mot de passe
 * (longueur minimale, mots de passe interdits...). Si ces règles changent,
 * les utilisateurs inscrits avec les anciennes règles doivent pouvoir
 * continuer à se connecter. On vérifie seulement que le mot de passe :
 * - n'est pas vide ;
 * - ne dépasse pas 128 caractères, pour qu'un texte énorme ne ralentisse
 *   pas le serveur au moment de le comparer au mot de passe haché.
 */
export const loginUserSchema = z.object({
	email: z.email("Email is not valid"),
	password: z
		.string()
		// Un caractère accentué peut s'écrire de deux façons : "é" en un seul
		// caractère, ou "e" suivi d'un accent. La normalisation "NFC" les ramène
		// toujours à la même forme, sinon le même mot de passe donnerait deux
		// hachages différents.
		.normalize("NFC")
		.min(1, "Password is required")
		.max(128, "Password must be at most 128 characters"),
});

export type loginUserDto = z.infer<typeof loginUserSchema>;
