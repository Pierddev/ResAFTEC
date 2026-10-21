import { Router } from "express";
import { BookingController } from "../controllers/bookingController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const bookingController = new BookingController();

/**
 * @swagger
 * /api/get-booking-by-classroom/{classroomId}:
 *   get:
 *     summary: Récupérer les réservations d'une salle
 *     description: Renvoie la liste de toutes les réservations associées à un identifiant de salle donné.
 *     tags:
 *       - Bookings
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
 *         description: Liste des réservations récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
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
	"/get-booking-by-classroom/:classroomId",
	authenticate,
	bookingController.getByClassroom,
);

/**
 * @swagger
 * /api/create-booking:
 *   post:
 *     summary: Créer une réservation
 *     description: Crée une nouvelle réservation de salle.
 *     tags:
 *       - Bookings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - reservedForUserId
 *               - classroomId
 *               - start_at
 *               - end_at
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: Le titre de la réservation
 *               reservedForUserId:
 *                 type: integer
 *                 description: L'ID de l'utilisateur concerné
 *               classroomId:
 *                 type: integer
 *                 description: L'ID de la salle
 *               start_at:
 *                 type: string
 *                 format: date-time
 *                 description: Date de début
 *               end_at:
 *                 type: string
 *                 format: date-time
 *                 description: Date de fin
 *               equipmentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs des équipements (optionnel)
 *     responses:
 *       201:
 *         description: Réservation créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Données invalides ou conflit de réservation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Non authentifié (Token JWT manquant ou invalide)
 */
router.post("/create-booking", authenticate, bookingController.create);

export default router;
