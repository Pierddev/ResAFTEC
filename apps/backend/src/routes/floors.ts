import { Router } from "express";
import { FloorController } from "../controllers/floorController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const floorController = new FloorController();

/**
 * @swagger
 * /api/get-floor-by-building/{buildingId}:
 *   get:
 *     summary: Récupérer les étages d'un bâtiment
 *     description: Renvoie la liste de tous les étages associés à un identifiant de bâtiment donné.
 *     tags:
 *       - Floors
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID du bâtiment
 *     responses:
 *       200:
 *         description: Liste des étages récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 floors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Floor'
 *       400:
 *         description: Paramètre buildingId invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Non authentifié (Token JWT manquant ou invalide)
 *       500:
 *         description: Erreur interne du serveur
 */
router.get(
	"/get-floor-by-building/:buildingId",
	authenticate,
	floorController.getByBuilding,
);

export default router;
