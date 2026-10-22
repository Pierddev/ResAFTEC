import axios, { type AxiosError } from "axios";

// Create axios instance
const api = axios.create({
	// baseURL define the base URL for all requests
	baseURL: "/api",
	withCredentials: true,
	// default header to allow the back end to know that we're sending JSON
	headers: {
		"Content-Type": "application/json",
	},
});

// Adresses pour lesquelles une erreur 401 est normale : on ne redirige pas
// - /login : l'email ou le mot de passe est faux
// - /me : le garde de navigation vérifie s'il existe une session ;
//   sans cela, la page de connexion se rechargerait en boucle
const urlsWithoutRedirect = ["/login", "/me"];

/**
 * Traite les erreurs renvoyées par les appels à l'API.
 *
 * Si le backend répond 401, le token JWT est absent ou expiré (il dure
 * 1 heure) : on renvoie l'utilisateur vers la page de connexion.
 *
 * La fonction est exportée pour pouvoir la tester seule (voir apiService.test.ts).
 *
 * @param error - l'erreur créée par axios
 * @returns une promesse rejetée, que le composant attrape avec try/catch
 */
export function handleApiError(error: AxiosError) {
	// error.response existe : le backend a répondu avec un code d'erreur (ex. 401 ou 400)
	if (error.response) {
		const url = error.config?.url ?? "";

		if (error.response.status === 401 && !urlsWithoutRedirect.includes(url)) {
			// window.location.href recharge toute l'application : le store est
			// vidé, l'utilisateur n'est donc plus considéré comme connecté
			window.location.href = "/login?error=unauthorized";
		}

		// On transmet au composant le corps de la réponse (ex. { message: "..." })
		return Promise.reject(error.response.data);
	}

	// error.request existe mais pas error.response : le backend n'a pas répondu
	// (serveur arrêté, problème de CORS, délai dépassé...)
	if (error.request) {
		return Promise.reject({
			message: "API is unreachable (server down or CORS)",
		});
	}

	// Pour tous les autres cas, on transmet l'erreur telle quelle
	return Promise.reject(error);
}

// Intercepteur de réponse : il s'exécute à chaque réponse du backend,
// avant que le composant reçoive le résultat
api.interceptors.response.use(
	// Réponse réussie (code 2XX) : on la renvoie sans la modifier
	(response) => response,

	// Réponse en erreur (code 4XX ou 5XX) ou pas de réponse du tout
	handleApiError,
);

// Export the instance for using it in components
export default api;
