import { Router } from "express";
import { BookingController } from "../controllers/bookingController.js";
import { BookingSeriesController } from "../controllers/bookingSeriesController.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";

const bookingSeriesController = new BookingSeriesController();
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

/**
 * @swagger
 * /api/create-booking-series:
 *   post:
 *     summary: Créer une série de réservations
 *     description: |
 *       Réserve la même salle chaque semaine, le même jour et sur le même créneau (heure de Paris).
 *       Les occurrences déjà commencées sont ignorées. Chaque occurrence libre devient une réservation ;
 *       une occurrence qui chevauche une réservation ou une désactivation de la salle est renvoyée dans `failed`.
 *       La série est enregistrée même si toutes les occurrences sont en échec.
 *       Réservé aux rôles `teacher` et `admin` ; un formateur (`teacher`) ne peut réserver que pour lui-même,
 *       et pas le dimanche (seul un administrateur le peut).
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
 *               - classroomId
 *               - reservedForUserId
 *               - dayOfWeek
 *               - startTime
 *               - endTime
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 example: Cours de TypeScript
 *               classroomId:
 *                 type: integer
 *                 description: L'ID de la salle principale
 *                 example: 1
 *               reservedForUserId:
 *                 type: integer
 *                 description: L'ID du bénéficiaire (pour un formateur, son propre ID)
 *                 example: 2
 *               dayOfWeek:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 description: Jour de la semaine (1 = lundi, ..., 7 = dimanche). Le dimanche est réservé aux administrateurs.
 *                 example: 2
 *               startTime:
 *                 type: string
 *                 description: Heure de début à Paris (HH:mm)
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 description: Heure de fin à Paris (HH:mm)
 *                 example: "12:00"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Lundi de la première semaine
 *                 example: "2026-11-02"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Dimanche de la dernière semaine (52 semaines maximum)
 *                 example: "2026-12-13"
 *     responses:
 *       201:
 *         description: Série enregistrée, avec le rapport des occurrences réservées et en échec
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 series:
 *                   $ref: '#/components/schemas/BookingSeries'
 *                 booked:
 *                   type: array
 *                   description: Les réservations obtenues
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       start_at:
 *                         type: string
 *                         format: date-time
 *                       end_at:
 *                         type: string
 *                         format: date-time
 *                 failed:
 *                   type: array
 *                   description: Les occurrences en échec, avec leur motif
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         description: Date et heure de début de l'occurrence
 *                       reason:
 *                         type: string
 *                         enum: [already_booked, disabled]
 *                         description: already_booked = salle déjà réservée, disabled = salle désactivée
 *       400:
 *         description: Données invalides, salle ou bénéficiaire inexistant, ou aucune occurrence à venir
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
 *       403:
 *         description: Rôle non autorisé, ou formateur qui réserve pour quelqu'un d'autre ou un dimanche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
	"/create-booking-series",
	authenticate,
	authorizeRole(["teacher", "admin"]),
	bookingSeriesController.create,
);

/**
 * @swagger
 * /api/get-replacement-classrooms/{seriesId}:
 *   get:
 *     summary: Chercher une salle de remplacement pour une occurrence en échec
 *     description: |
 *       Renvoie les autres salles libres sur le créneau de la série (heure de Paris) à la date demandée,
 *       c'est-à-dire ni réservées ni désactivées, même partiellement.
 *       Seules les salles qui ont au moins autant de places que la salle principale sont proposées,
 *       et la salle principale est exclue.
 *       Tri par proximité : même étage, puis même bâtiment, puis les autres ; à proximité égale, par nom.
 *       Réservé à l'auteur de la série et aux administrateurs.
 *     tags:
 *       - Bookings
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de la série
 *         example: 1
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de l'occurrence en échec (AAAA-MM-JJ). Elle doit tomber le jour de la série, dans sa plage de semaines, et ne pas avoir commencé.
 *         example: "2026-11-10"
 *     responses:
 *       200:
 *         description: Salles libres, de la plus proche à la plus éloignée (liste vide si aucune salle n'est libre)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 classrooms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       capacity:
 *                         type: integer
 *                       floor:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           level:
 *                             type: integer
 *                           building:
 *                             $ref: '#/components/schemas/Building'
 *       400:
 *         description: Paramètres invalides, ou date qui n'est pas une occurrence à venir de la série
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
 *       403:
 *         description: Rôle non autorisé, ou utilisateur qui n'est ni l'auteur de la série ni administrateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Série introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get(
	"/get-replacement-classrooms/:seriesId",
	authenticate,
	authorizeRole(["teacher", "admin"]),
	bookingSeriesController.getReplacementClassrooms,
);

/**
 * @swagger
 * /api/add-booking-series-occurrences/{seriesId}:
 *   post:
 *     summary: Réserver les occurrences en échec d'une série
 *     description: |
 *       Réserve des occurrences en échec d'une série, chacune dans la salle choisie (souvent une salle de remplacement).
 *       Le titre, le bénéficiaire et le créneau (heure de Paris) sont repris de la série.
 *       Chaque réservation obtenue est rattachée à la série, même si sa salle n'est pas la salle principale.
 *       Mêmes vérifications que pour créer une série : une occurrence qui chevauche une réservation
 *       ou une désactivation de la salle choisie est renvoyée dans `failed` (la salle a pu être prise entre-temps).
 *       Les réservations libres sont enregistrées en une seule transaction.
 *       Si une date n'est pas une occurrence à venir de la série ou si une salle n'existe pas, rien n'est réservé (400).
 *       Réservé à l'auteur de la série et aux administrateurs.
 *     tags:
 *       - Bookings
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: seriesId
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID de la série
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             minItems: 1
 *             maxItems: 52
 *             description: Les occurrences à réserver, une seule fois chaque date
 *             items:
 *               type: object
 *               required:
 *                 - date
 *                 - classroomId
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                   description: Date de l'occurrence (AAAA-MM-JJ). Elle doit tomber le jour de la série, dans sa plage de semaines, et ne pas avoir commencé.
 *                 classroomId:
 *                   type: integer
 *                   description: L'ID de la salle choisie pour cette date
 *             example:
 *               - date: "2026-11-10"
 *                 classroomId: 4
 *               - date: "2026-11-17"
 *                 classroomId: 6
 *     responses:
 *       201:
 *         description: Rapport de série, au même format que pour la création
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 series:
 *                   $ref: '#/components/schemas/BookingSeries'
 *                 booked:
 *                   type: array
 *                   description: Les réservations obtenues
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       start_at:
 *                         type: string
 *                         format: date-time
 *                       end_at:
 *                         type: string
 *                         format: date-time
 *                 failed:
 *                   type: array
 *                   description: Les occurrences encore en échec, avec leur motif
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         description: Date et heure de début de l'occurrence
 *                       reason:
 *                         type: string
 *                         enum: [already_booked, disabled]
 *                         description: already_booked = salle déjà réservée, disabled = salle désactivée
 *       400:
 *         description: Données invalides, date qui n'est pas une occurrence à venir de la série, ou salle inexistante
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
 *       403:
 *         description: Rôle non autorisé, ou utilisateur qui n'est ni l'auteur de la série ni administrateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Série introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post(
	"/add-booking-series-occurrences/:seriesId",
	authenticate,
	authorizeRole(["teacher", "admin"]),
	bookingSeriesController.addOccurrences,
);

export default router;
