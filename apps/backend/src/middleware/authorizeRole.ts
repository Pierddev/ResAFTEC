import type { NextFunction, Response } from "express";
import type { AuthRequest } from "./authenticate.js";

// Fabrique un middleware qui laisse passer seulement les rôles de la liste.
// À placer APRÈS authenticate, qui remplit req.role à partir du token.
// Ex. : router.post("/ma-route", authenticate, authorizeRole(["teacher", "admin"]), ...)
export function authorizeRole(allowedRoles: string[]) {
	// Le middleware : Express l'appelle à chaque requête sur la route
	function checkRole(req: AuthRequest, res: Response, next: NextFunction) {
		if (req.role && allowedRoles.includes(req.role)) {
			// Rôle autorisé : on passe à la suite (le contrôleur)
			next();
		} else {
			// 403 Forbidden : l'utilisateur est connecté, mais n'a pas le droit
			res.status(403).json({ message: "Accès refusé" });
		}
	}

	return checkRole;
}
