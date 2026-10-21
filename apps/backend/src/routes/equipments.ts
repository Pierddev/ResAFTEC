import { Router } from "express";
import { EquipmentController } from "../controllers/equipmentController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const equipmentController = new EquipmentController();

/**
 * @swagger
 * /api/classrooms/{classroomId}/equipments:
 *   get:
 *     summary: Récupérer les équipements d'une salle
 *     description: Renvoie la liste de tous les équipements associés à un identifiant de salle donné.
 *     tags:
 *       - Equipments
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de la salle
 *     responses:
 *       200:
 *         description: Liste des équipements récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 affectedEquipments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Equipment'
 *       400:
 *         description: Paramètre classroomId invalide ou manquant
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
	"/classrooms/:classroomId/equipments",
	authenticate,
	equipmentController.getAffectedByClassroom,
);

export default router;
