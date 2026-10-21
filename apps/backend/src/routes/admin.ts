import type { Request, Response } from "express";
import { Router } from "express";
import { UserController } from "../controllers/userController.js";
import { authenticate } from "../middleware/authenticate.js";
import { basicAuth } from "../middleware/basicAuth.js";

// Router for protected user profile routes
// All routes here require a valid JWT token (verified by authenticate)
const adminRouter = Router();
const userController = new UserController();

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
 *       500:
 *         description: Erreur interne du serveur
 */
adminRouter.get("/users", authenticate, userController.getAll);

export default adminRouter;
