import { Router } from "express";
import { IndexController } from "../controllers/indexController.js";

const router = Router();
const indexController = new IndexController();

// Base routes
/**
 * @swagger
 * /api/:
 *   get:
 *     summary: Vérifier le statut de l'API
 *     description: Renvoie un message simple indiquant que l'API de réservation de salles fonctionne.
 *     tags:
 *       - Base
 *     responses:
 *       200:
 *         description: API opérationnelle
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Reservation Salles API
 */
router.get("/", indexController.home);

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Se connecter à l'application
 *     description: Authentifie un utilisateur avec son email et mot de passe, et définit un cookie HTTP-only contenant le token JWT.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@example.com
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 128
 *                 example: motdepasseSecurise123
 *     responses:
 *       200:
 *         description: Connexion réussie (Cookie 'token' défini)
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=eyJhbGciOiJIUzI1NiIsIn...; Path=/; HttpOnly; SameSite=Lax
 *             description: Contient le token JWT de session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User logged in successfully
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
 *       400:
 *         description: Données de connexion invalides (Zod validation)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Incorrect password or email address.
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Incorrect password or email address.
 */
router.post("/login", indexController.login);

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Enregistrer un nouvel utilisateur
 *     description: Crée un nouveau compte utilisateur avec le rôle "student" par défaut.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - email
 *               - password
 *             properties:
 *               firstname:
 *                 type: string
 *                 maxLength: 50
 *                 example: Jean
 *               lastname:
 *                 type: string
 *                 maxLength: 50
 *                 example: Dupont
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@example.com
 *               password:
 *                 type: string
 *                 minLength: 10
 *                 example: motdepasseSecurise123
 *     responses:
 *       201:
 *         description: Utilisateur enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
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
 *       400:
 *         description: Erreur de validation ou email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to validate request
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.post("/register", indexController.register);

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Se déconnecter de l'application
 *     description: Supprime le cookie contenant le token de session JWT.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Efface le cookie 'token'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User logged out successfully
 */
router.post("/logout", indexController.logout);

export default router;
