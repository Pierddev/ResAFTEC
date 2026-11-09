import type { Request, Response } from "express";
import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { basicAuth } from "../middleware/basicAuth.js";

// Routeur des routes d'administration (préfixe /admin)
const adminRouter = Router();
const userController = new UserController();

/**
 * @swagger
 * /admin/basic:
 *   get:
 *     summary: Tester l'authentification Basic
 *     description: Route temporaire de test, protégée par une authentification Basic (identifiant et mot de passe dans l'en-tête Authorization) en attendant de passer par le JWT.
 *     tags:
 *       - Admin
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Identifiants corrects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 *                   example: Cet utilisateur a le droit de voir cette page
 *       401:
 *         description: Identifiants manquants ou incorrects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 */
adminRouter.get("/basic", basicAuth, (_req: Request, res: Response) => {
	res.json({ data: "Cet utilisateur a le droit de voir cette page" });
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Récupérer tous les utilisateurs
 *     description: Renvoie la liste de tous les utilisateurs (réservé aux administrateurs).
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié (Token JWT manquant ou invalide)
 *       403:
 *         description: Rôle non autorisé (l'utilisateur n'est pas administrateur)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Accès refusé
 *       500:
 *         description: Erreur interne du serveur
 */
// authenticate vérifie seulement que la personne est connectée.
// authorizeRole(["admin"]) vérifie en plus son rôle : sans lui,
// un étudiant connecté recevrait la liste de tous les utilisateurs.
adminRouter.get(
	"/users",
	authenticate,
	authorizeRole(["admin"]),
	userController.getAll,
);

export default adminRouter;
