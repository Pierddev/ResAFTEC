import { z } from "zod";
import { commonPasswords } from "../data/commonPasswords.js";

// On range la liste dans un Set : chercher un mot de passe dedans est
// instantané, alors qu'un tableau devrait être parcouru case par case.
const commonPasswordSet = new Set(commonPasswords);

/**
 * Indique si un mot de passe fait partie des mots de passe les plus utilisés
 * (voir data/commonPasswords.ts). La liste est en minuscules, donc on compare
 * en minuscules : "Password123!" est refusé comme "password123!".
 *
 * @param password - le mot de passe choisi par l'utilisateur
 * @returns true si le mot de passe est dans la liste, sinon false
 */
function isCommonPassword(password: string): boolean {
	return commonPasswordSet.has(password.toLowerCase());
}

/**
 * Schéma de validation des données envoyées sur POST /api/register.
 *
 * Règles du mot de passe (issue #27) :
 * - entre 12 et 128 caractères ;
 * - ne pas faire partie des mots de passe les plus utilisés ;
 * - aucune obligation de majuscule, de chiffre ou de caractère spécial :
 *   l'OWASP (ASVS 5.0, exigence 6.2.5) et le NIST (SP 800-63B-4) déconseillent
 *   ces règles, car elles poussent vers des mots de passe prévisibles
 *   comme "Password123!". Un mot de passe long est plus difficile à deviner.
 */
export const createUserSchema = z.object({
	firstname: z
		.string()
		.min(1, "Le prénom est obligatoire")
		.max(50, "Le prénom est trop long (50 caractères maximum)"),
	lastname: z
		.string()
		.min(1, "Le nom est obligatoire")
		.max(50, "Le nom est trop long (50 caractères maximum)"),
	email: z.email("L'email doit être valide"),
	password: z
		.string()
		// Même normalisation qu'au login (voir loginUser.dto.ts) : un "é" tapé
		// de deux façons différentes donne toujours le même mot de passe.
		.normalize("NFC")
		.min(12, "Le mot de passe doit faire au moins 12 caractères")
		.max(128, "Le mot de passe est trop long (128 caractères maximum)")
		// refine() ajoute une règle personnalisée : la fonction doit renvoyer
		// true pour que le mot de passe soit accepté.
		.refine(
			(password) => !isCommonPassword(password),
			"Ce mot de passe est trop courant, choisissez-en un autre",
		),
});

export type createUserDto = z.infer<typeof createUserSchema>;
