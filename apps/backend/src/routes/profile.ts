import { Router } from "express";
import { ProfileController } from "../controllers/profileController.js";
import { authenticate } from "../middleware/authenticate.js";

// Routeur du profil de l'utilisateur connecté
// Toutes ces routes demandent un token JWT valide (vérifié par authenticate)
const router = Router();
const profileController = new ProfileController();

/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Récupérer l'utilisateur connecté
 *     description: Renvoie les informations de l'utilisateur dont le token JWT est dans le cookie. Le frontend l'utilise pour restaurer la session après un rafraîchissement de la page.
 *     tags:
 *       - Profile
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Utilisateur connecté récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     firstname:
 *                       type: string
 *                       example: Jean
 *                     lastname:
 *                       type: string
 *                       example: Dupont
 *                     email:
 *                       type: string
 *                       example: jean.dupont@example.com
 *                     role:
 *                       type: integer
 *                       example: 2
 *                     roleName:
 *                       type: string
 *                       example: student
 *       401:
 *         description: Non authentifié (token JWT manquant ou invalide, ou utilisateur introuvable)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No token provided
 *       500:
 *         description: Erreur interne du serveur (clé JWT non configurée)
 */
router.get("/me", authenticate, profileController.me);

export default router;
