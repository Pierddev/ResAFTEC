import { Router } from "express";
import { ClassroomController } from "../controllers/classroomController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const classroomController = new ClassroomController();

/**
 * @swagger
 * /api/get-classroom-by-floor/{floorId}:
 *   get:
 *     summary: Récupérer les salles d'un étage
 *     description: Renvoie la liste de toutes les salles associées à un identifiant d'étage donné.
 *     tags:
 *       - Classrooms
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de l'étage
 *     responses:
 *       200:
 *         description: Liste des salles récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 classrooms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Classroom'
 *       400:
 *         description: Paramètre floorId invalide ou manquant
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
	"/get-classroom-by-floor/:floorId",
	authenticate,
	classroomController.getByFloor,
);

export default router;
