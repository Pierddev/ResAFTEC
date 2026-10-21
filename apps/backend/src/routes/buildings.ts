import { Router } from "express";
import { BuildingController } from "../controllers/buildingController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const buildingController = new BuildingController();

/**
 * @swagger
 * /api/get-building:
 *   get:
 *     summary: Récupérer tous les bâtiments
 *     description: Renvoie la liste de tous les bâtiments.
 *     tags:
 *       - Buildings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Liste des bâtiments récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 buildings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Building'
 *       401:
 *         description: Non authentifié (Token JWT manquant ou invalide)
 *       500:
 *         description: Erreur interne du serveur
 */
router.get("/get-building", authenticate, buildingController.getAll);

export default router;
