import {
	createRouter,
	createWebHistory,
	type RouteLocationNormalized,
} from "vue-router";
import { useAuthStore } from "@/stores/auth";

// Define routes config
const routes = [
	{
		path: "/",
		name: "Home",
		component: () => import("../views/HomePage.vue"),
	},
	{
		path: "/login",
		name: "Login",
		// Lazy-loading : load only when the route is called => more efficient, don't load all at once
		component: () => import("../views/LoginPage.vue"),
	},
	{
		path: "/register",
		name: "Register",
		component: () => import("../views/RegisterPage.vue"),
	},
	{
		path: "/",
		component: () => import("../layouts/AuthenticatedLayout.vue"),
		children: [
			{
				path: "/dashboard",
				name: "Dashboard",
				component: () => import("../views/Dashboard/Dashboard.vue"),
			},
			{
				path: "/booking",
				name: "Booking",
				component: () => import("../views/BookingPage.vue"),
			},
		],
	},
];

// createRouter : create a router instance
// createWebHistory : use the html5 history mode => /login instead of #/login
const router = createRouter({
	history: createWebHistory(),
	routes,
});

/**
 * Garde de navigation : vérifie si l'utilisateur est connecté avant
 * chaque changement de page.
 *
 * Après un rafraîchissement de la page (F5), le store est vide. Le garde
 * essaie alors de restaurer la session grâce au cookie HttpOnly qui contient
 * le token JWT (appel GET /api/me).
 *
 * La fonction est exportée pour pouvoir la tester seule (voir index.test.ts).
 *
 * @param to - la page que l'utilisateur veut ouvrir
 * @returns true pour autoriser l'accès, ou la page vers laquelle le rediriger
 */
export async function authGuard(to: RouteLocationNormalized) {
	// On récupère le store d'authentification
	const authStore = useAuthStore();

	// Pages publiques : accessibles sans être connecté
	const publicPages = ["Home", "Login", "Register"];
	const isPublicPage = publicPages.includes(to.name as string);

	// Si le store dit "pas connecté", on essaie de restaurer la session
	// à partir du cookie
	if (!authStore.isAuthenticated) {
		await authStore.fetchUser();
	}

	// Pas connecté + page protégée → redirection vers la page de connexion
	if (!authStore.isAuthenticated && !isPublicPage) {
		return { name: "Login", query: { error: "unauthorized" } };
	}

	// Connecté + page publique → redirection vers le tableau de bord
	if (authStore.isAuthenticated && isPublicPage) {
		return { name: "Dashboard" };
	}

	// Dans tous les autres cas, on laisse l'utilisateur ouvrir la page
	return true;
}

// On lance le garde avant chaque changement de page
router.beforeEach(authGuard);

export default router;
