<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import aftecLogo from "@/assets/logo/aftec_logo.svg";
import { useAuthStore } from "@/stores/auth";

// get the auth store
const authStore = useAuthStore();

// get the current route (to handle redirection after login if needed)
const route = useRoute();
const router = useRouter();
const successMessage =
	route.query.registered === "1"
		? "Inscription réussie ! Veuillez vous connecter."
		: "";

// reactive variables for the form
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);

if (route.query.error === "unauthorized") {
	errorMessage.value = "Vous devez être connecté pour accéder à cette page.";
}

/**
 * Vérifie le formulaire de connexion puis envoie l'email et le mot de passe
 * au backend.
 *
 * On ne vérifie pas la longueur minimale du mot de passe ici : un compte
 * créé avec d'anciennes règles doit pouvoir se connecter. On vérifie
 * seulement la longueur maximale (128 caractères), comme le backend.
 */
async function handleSubmit() {
	// On efface l'ancien message d'erreur au début de chaque tentative
	errorMessage.value = "";

	// On vérifie que l'email et le mot de passe sont remplis
	if (!email.value || !password.value) {
		errorMessage.value = "Tous les champs sont requis";
		return;
	}

	if (password.value.length > 128) {
		errorMessage.value = "Le mot de passe ne doit pas dépasser 128 caractères";
		return;
	}

	// isLoading désactive le bouton pour éviter d'envoyer plusieurs fois le formulaire
	isLoading.value = true;
	try {
		await authStore.login(email.value, password.value);
		// Connexion réussie : on redirige vers le tableau de bord
		router.push("/dashboard");
	} catch (error) {
		// L'erreur renvoyée par le backend est un objet avec une propriété "message"
		// (ex. mauvais identifiants, ou trop de tentatives ratées)
		errorMessage.value = (error as { message: string }).message;
	} finally {
		// Dans tous les cas, on réactive le bouton
		isLoading.value = false;
	}
}
</script>

<template>
    <div class="h-screen flex justify-center items-center">
        <form class="flex flex-col h-fit min-w-120 gap-4 justify-center items-center card-layout p-10 rounded-3xl" @submit.prevent="handleSubmit">
            <div class="bg-white p-5 rounded-full">
                <img :src="aftecLogo" class="w-12 h-12" alt="Logo" />
            </div>
            <h1 class="font-heading font-bold text-2xl">Connexion</h1>
            <!-- Error message -->
            <p class="card-error text-sm font-medium" v-if="errorMessage">{{ errorMessage }}</p>
            <!-- Success message -->
            <p class="card-success text-sm font-medium" v-if="successMessage">{{ successMessage }}</p>

            <!-- Email field -->
            <div class="field w-full">
                <label for="email">Email</label>
                <input
                id="email"
                v-model="email"
                type="email"
                placeholder="exemple@email.fr"
                required
                />
            </div>

            <!-- password field -->
            <div class="field w-full">
                <label for="password">Mot de passe</label>
                <input
                id="password"
                v-model="password"
                type="password"
                placeholder="Votre mot de passe"
                required
                />
            </div>

            <!-- Submit button -->
            <button class="btn-login" type="submit" :disabled="isLoading">
            {{ isLoading ? "Connexion..." : "Se connecter" }}
            </button>

            <!-- Signup link -->
            <p class="text-sm text-center opacity-70">
                Pas encore inscrit ? <RouterLink to="/register" class="text-aftec-blue hover:underline cursor-pointer">Inscrivez-vous</RouterLink>
            </p>
        </form>
    </div>
</template>