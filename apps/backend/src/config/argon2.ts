import argon2, { type HashOptions } from "argon2";

/**
 * Réglages utilisés pour hacher les mots de passe avec Argon2id (issue #195).
 * Remplace l'ancienne constante HashSalt de bcrypt.
 *
 * Argon2id est l'algorithme recommandé par l'OWASP (Password Storage Cheat
 * Sheet). On écrit nous-mêmes ses réglages au lieu de garder ceux de la
 * bibliothèque (64 Mio de RAM pour chaque hachage). Ce sont les valeurs
 * minimales conseillées par l'OWASP :
 * - memoryCost : mémoire utilisée pour un hachage, en Kio (19456 Kio = 19 Mio) ;
 * - timeCost : nombre de passages sur cette mémoire ;
 * - parallelism : nombre de threads utilisés pour un hachage.
 *
 * Plus ces valeurs sont grandes, plus un attaquant qui a volé la base de
 * données met de temps à tester chaque mot de passe... mais plus la connexion
 * est lente et consomme de RAM sur le serveur.
 *
 * Pas besoin de réglage pour le sel (salt) : argon2 en tire un nouveau au
 * hasard à chaque hachage et l'écrit dans le résultat, par exemple
 * "$argon2id$v=19$m=19456,t=2,p=1$<sel>$<hash>".
 */
export const argon2Options: HashOptions = {
	type: argon2.argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1,
};
