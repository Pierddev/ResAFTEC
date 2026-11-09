<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import api from "@/services/apiService";
import {
	type BookingSeriesReport,
	bookingSeriesService,
	type FailureReason,
} from "@/services/bookingSeriesService";
import { type Classroom, classroomService } from "@/services/classroomService";
import { useAuthStore } from "@/stores/auth";
import {
	formatWeekRange,
	getIsoWeek,
	getMondayOfIsoWeek,
	getSundayOfIsoWeek,
	isValidIsoWeek,
	isWeekBefore,
	normalizeIsoWeek,
	toIsoDate,
} from "@/utils/isoWeek";

console.log("BookingPage loaded");

interface Building {
	id: number;
	name: string;
}

const buildings = ref<Building[]>([]);
const selectedBuilding = ref<number | null>(null);

interface Floor {
	id: number;
	level: number;
}

const floors = ref<Floor[]>([]);
const selectedFloor = ref<number | null>(null);

async function fetchFloors(buildingId: number) {
	try {
		const response = await api.get(`/get-floor-by-building/${buildingId}`);
		floors.value = response.data.floors;
	} catch (error) {
		console.error("Erreur lors de la récupération des étages :", error);
		floors.value = [];
	}
}

const classrooms = ref<Classroom[]>([]);
const selectedClassroom = ref<number | null>(null);

async function fetchClassroom(floorId: number) {
	try {
		// Appel direct de la méthode du service qui renvoie un tableau typé Classroom[]
		classrooms.value = await classroomService.getByFloor(floorId);
	} catch (error) {
		console.error("Erreur lors de la récupération des salles :", error);
		classrooms.value = [];
	}
}

// onMounted permet de charger les informations au chargement de la page/composant
onMounted(async () => {
	try {
		const response = await api.get("/get-building");
		buildings.value = response.data.buildings;
	} catch (error) {
		console.error("Erreur lors de la récupération des bâtiments :", error);
	}
});

watch(selectedBuilding, (newBuildingId) => {
	selectedFloor.value = null;
	if (newBuildingId) {
		fetchFloors(newBuildingId);
	} else {
		floors.value = [];
	}
});

watch(selectedFloor, (newFloorId) => {
	selectedClassroom.value = null;
	if (newFloorId) {
		fetchClassroom(newFloorId);
	} else {
		classrooms.value = [];
	}
});

const capacity = ref(15);

// ---------- Nouvelle réservation ----------

const authStore = useAuthStore();

// Seuls les formateurs et les administrateurs peuvent réserver une série
const canBook = computed(() => {
	const roleName = authStore.user?.roleName;
	return roleName === "teacher" || roleName === "admin";
});

// Jours proposés dans la liste, numérotés comme dans l'API : 1 = lundi, ..., 7 = dimanche
const daysOfWeek = [
	{ value: 1, label: "Lundi" },
	{ value: 2, label: "Mardi" },
	{ value: 3, label: "Mercredi" },
	{ value: 4, label: "Jeudi" },
	{ value: 5, label: "Vendredi" },
	{ value: 6, label: "Samedi" },
	{ value: 7, label: "Dimanche" },
];

// Un formateur ne peut pas réserver le dimanche : seul un administrateur voit ce jour
const availableDays = computed(() => {
	if (authStore.user?.roleName === "teacher") {
		// 7 = dimanche
		return daysOfWeek.filter((day) => day.value !== 7);
	}
	return daysOfWeek;
});

// Heures proposées dans les listes : de 07:00 à 22:00, toutes les 15 minutes
const FIRST_HOUR = 7;
const LAST_HOUR = 22;
const MINUTES_STEP = 15;

/**
 * Construit la liste des heures proposées, au format 24 heures.
 * On utilise une liste plutôt qu'un champ <input type="time"> : ce champ
 * affiche "10:00 AM" quand le navigateur est en anglais.
 *
 * @returns les heures au format "HH:mm", ex. : ["07:00", "07:15", ..., "22:00"]
 */
function buildTimeOptions(): string[] {
	const times: string[] = [];

	// On compte en minutes depuis minuit : 07:00 = 420 minutes, 22:00 = 1320 minutes
	for (
		let minutes = FIRST_HOUR * 60;
		minutes <= LAST_HOUR * 60;
		minutes += MINUTES_STEP
	) {
		const hour = Math.floor(minutes / 60);
		const minute = minutes % 60;
		// padStart ajoute un 0 devant si besoin : 7 → "07", 0 → "00"
		times.push(
			`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
		);
	}

	return times;
}

const timeOptions = buildTimeOptions();

// Semaine actuelle : elle est proposée par défaut,
// et on ne peut pas choisir une semaine plus ancienne
const currentWeek = getIsoWeek(new Date());

// Champs du formulaire
const title = ref("");
const isWeekly = ref(false);
const dayOfWeek = ref<number | null>(null);
const startTime = ref("");
const endTime = ref("");
const startWeek = ref(currentWeek.week);
const startYear = ref(currentWeek.year);
const endWeek = ref(currentWeek.week);
const endYear = ref(currentWeek.year);

const errorMessage = ref("");
// true pendant l'envoi : le bouton est désactivé pour éviter d'envoyer deux fois la série
const isSending = ref(false);

// Rapport de série renvoyé par le backend (null tant qu'aucune série n'est réservée)
const report = ref<BookingSeriesReport | null>(null);

// Texte affiché pour chaque motif d'échec renvoyé par l'API
const failureReasonLabels: Record<FailureReason, string> = {
	already_booked: "déjà réservée",
	disabled: "salle désactivée",
};

/**
 * Affiche la date d'une occurrence en échec, à l'heure de Paris.
 *
 * @param date - le début du cours en UTC, ex. : "2027-03-30T08:00:00.000Z"
 * @returns le jour et la date, ex. : "mardi 30/03/2027"
 */
function formatFailedDate(date: string): string {
	// timeZone "Europe/Paris" : l'API renvoie l'heure UTC (08:00Z = 10h à Paris en été)
	return new Date(date).toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "Europe/Paris",
	});
}

/**
 * Construit le texte affiché sous une semaine choisie dans le formulaire.
 *
 * @param week - le numéro de semaine saisi
 * @param year - l'année saisie
 * @returns le texte, ex. : "S12-2027 : du 22/03 au 28/03", ou "" si la semaine n'existe pas
 */
function getWeekLabel(week: number, year: number): string {
	if (!isValidIsoWeek(week, year)) {
		return "";
	}
	return formatWeekRange(week, year);
}

// computed : le texte est recalculé automatiquement dès qu'un champ change
const startWeekLabel = computed(() =>
	getWeekLabel(startWeek.value, startYear.value),
);
const endWeekLabel = computed(() => getWeekLabel(endWeek.value, endYear.value));

// Plus petite valeur des champs semaine (attribut min) : le bouton − ne peut pas
// descendre avant la semaine actuelle, ni mettre la fin avant le début.
// undefined = pas de minimum : dans une autre année, le − doit pouvoir
// passer à la dernière semaine de l'année précédente.
const startWeekMin = computed(() => {
	if (startYear.value === currentWeek.year) {
		return currentWeek.week;
	}
	return undefined;
});
const endWeekMin = computed(() => {
	if (endYear.value === startYear.value) {
		return startWeek.value;
	}
	return undefined;
});

/**
 * Appelée quand la semaine ou l'année de début change
 * (clic sur + ou −, ou saisie au clavier quand on quitte le champ).
 */
function onStartWeekChange() {
	// Champ vide ou nombre à virgule : on ne corrige rien,
	// le message d'erreur s'affichera à l'envoi du formulaire
	if (
		!Number.isInteger(startWeek.value) ||
		!Number.isInteger(startYear.value)
	) {
		return;
	}

	// Passage d'une année à l'autre, ex. : + sur S53-2026 → S1-2027
	const start = normalizeIsoWeek(startWeek.value, startYear.value);
	startWeek.value = start.week;
	startYear.value = start.year;

	// La semaine de fin rattrape la semaine de début si elle est avant
	const end = { week: endWeek.value, year: endYear.value };
	if (isWeekBefore(end, start)) {
		endWeek.value = start.week;
		endYear.value = start.year;
	}
}

/**
 * Appelée quand la semaine ou l'année de fin change.
 */
function onEndWeekChange() {
	if (!Number.isInteger(endWeek.value) || !Number.isInteger(endYear.value)) {
		return;
	}

	// Passage d'une année à l'autre, ex. : − sur S1-2027 → S53-2026
	const end = normalizeIsoWeek(endWeek.value, endYear.value);
	endWeek.value = end.week;
	endYear.value = end.year;
}

/**
 * Vérifie le formulaire, puis demande au backend de créer la série.
 * Le backend vérifie aussi les données : s'il refuse, son message est affiché.
 */
async function submitSeries() {
	// On efface l'ancien message d'erreur et l'ancien rapport au début de chaque envoi
	errorMessage.value = "";
	report.value = null;

	// Sans la case cochée, il n'y a rien à envoyer :
	// la réservation ponctuelle n'existe pas encore sur cette page
	if (!isWeekly.value) {
		return;
	}

	// 1. Vérifications que l'attribut "required" des champs ne fait pas
	if (selectedClassroom.value === null) {
		errorMessage.value = "Choisissez une salle dans les filtres";
		return;
	}
	if (dayOfWeek.value === null) {
		errorMessage.value = "Choisissez un jour de la semaine";
		return;
	}
	if (!isValidIsoWeek(startWeek.value, startYear.value)) {
		errorMessage.value = "La semaine de début n'existe pas";
		return;
	}
	if (!isValidIsoWeek(endWeek.value, endYear.value)) {
		errorMessage.value = "La semaine de fin n'existe pas";
		return;
	}
	// Une semaine passée tapée au clavier : le navigateur bloque déjà l'envoi
	// grâce à l'attribut min, on vérifie quand même ici
	const start = { week: startWeek.value, year: startYear.value };
	if (isWeekBefore(start, currentWeek)) {
		errorMessage.value = "La semaine de début est déjà passée";
		return;
	}

	// 2. La série va du lundi de la semaine de début au dimanche de la semaine de fin
	const startDate = getMondayOfIsoWeek(startWeek.value, startYear.value);
	const endDate = getSundayOfIsoWeek(endWeek.value, endYear.value);

	// Sans cette vérification, le backend répondrait "Aucune occurrence à venir",
	// ce qui ne dit pas d'où vient le problème
	if (endDate < startDate) {
		errorMessage.value =
			"La semaine de fin doit être après la semaine de début";
		return;
	}

	// 3. Envoi au backend
	isSending.value = true;
	try {
		// On garde le rapport pour l'afficher sous le formulaire
		report.value = await bookingSeriesService.create({
			title: title.value,
			classroomId: selectedClassroom.value,
			// Le bénéficiaire est la personne connectée.
			// Number() : l'API renvoie pour l'instant les id en texte ("2"), voir #217
			reservedForUserId: Number(authStore.user?.id),
			dayOfWeek: dayOfWeek.value,
			startTime: startTime.value,
			endTime: endTime.value,
			startDate: toIsoDate(startDate),
			endDate: toIsoDate(endDate),
		});
	} catch (error) {
		// L'erreur renvoyée par le backend est un objet avec une propriété "message"
		// (ex. : "Une série ne peut pas dépasser 52 semaines")
		errorMessage.value = (error as { message: string }).message;
	} finally {
		// Dans tous les cas, on réactive le bouton
		isSending.value = false;
	}
}
</script>

<template>
    <div class="h-full w-full">
        <!-- Title -->
        <h1 class="font-heading text-xl card-layout py-3 rounded-3xl w-fit px-10">Réservation de Salles</h1>
        <div class="flex flex-wrap items-start gap-4 mt-4">
            <!-- Search & filters -->
            <div class="flex flex-col gap-10 card-layout rounded-3xl p-4 w-100">
                <div class="font-bold text-lg">Recherches & Filtres</div>
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col items-center mx-10">
                        <select id="building" v-model="selectedBuilding" class="border-2 border-black/30 w-full p-2 rounded-xl">
                            <option :value="null" disabled>Choisir un bâtiment</option>
                            <option v-for="building in buildings" :key="building.id" :value="building.id">{{ building.name }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col items-center mx-10">
                        <select id="floor" v-model="selectedFloor" class="border-2 border-black/30 w-full p-2 rounded-xl">
                            <option :value="null" disabled>Choisir un étage</option>
                            <option v-for="floor in floors" :key="floor.id" :value="floor.id">Étage {{ floor.level }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col items-center mx-10">
                        <select id="classroom" v-model="selectedClassroom" class="border-2 border-black/30 w-full p-2 rounded-xl">
                            <option :value="null" disabled>Choisir une salle</option>
                            <option v-for="classroom in classrooms" :key="classroom.id" :value="classroom.id">Salle {{ classroom.name }}</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between">
                        <div class="text-lg font-bold">Capacité minimum</div>
                        <output id="capacity_value" class="text-black/60 font-bold">{{ capacity }}</output>
                    </div>
                    <input id="capacity_input" v-model="capacity" type="range" min="5" max="100" step="5" class="w-full accent-aftec-blue">
                </div>
                <div>
                    <div>Équipements inclus</div>
                    <div>
                        <div>Wi-Fi</div>
                        <div>Climatisation</div>
                    </div>
                </div>
            </div>

            <!-- Nouvelle réservation : seulement pour les formateurs et les administrateurs -->
            <form v-if="canBook" class="flex flex-col gap-4 card-layout rounded-3xl p-4 w-100" @submit.prevent="submitSeries">
                <div class="font-bold text-lg">Nouvelle réservation</div>

                <div class="field">
                    <label for="title">Titre</label>
                    <input id="title" v-model="title" type="text" maxlength="100" placeholder="Cours de TypeScript" required>
                </div>

                <label class="flex items-center gap-2">
                    <input id="is_weekly" v-model="isWeekly" type="checkbox" class="accent-aftec-blue">
                    Répéter chaque semaine
                </label>

                <!-- Champs de la série : affichés seulement si la case est cochée -->
                <div v-if="isWeekly" class="flex flex-col gap-4">
                    <div class="field">
                        <label for="day_of_week">Jour</label>
                        <select id="day_of_week" v-model="dayOfWeek" class="border-2 border-black/30 w-full p-2 rounded-xl" required>
                            <option :value="null" disabled>Choisir un jour</option>
                            <option v-for="day in availableDays" :key="day.value" :value="day.value">{{ day.label }}</option>
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <div class="field flex-1">
                            <label for="start_time">Heure de début</label>
                            <select id="start_time" v-model="startTime" class="border-2 border-black/30 w-full p-2 rounded-xl" required>
                                <option value="" disabled>Choisir</option>
                                <option v-for="time in timeOptions" :key="time" :value="time">{{ time }}</option>
                            </select>
                        </div>
                        <div class="field flex-1">
                            <label for="end_time">Heure de fin</label>
                            <select id="end_time" v-model="endTime" class="border-2 border-black/30 w-full p-2 rounded-xl" required>
                                <option value="" disabled>Choisir</option>
                                <option v-for="time in timeOptions" :key="time" :value="time">{{ time }}</option>
                            </select>
                        </div>
                    </div>

                    <!-- Semaine de début : numéro de semaine ISO et année -->
                    <div class="field">
                        <label for="start_week">Semaine de début</label>
                        <div class="flex gap-2">
                            <input id="start_week" v-model.number="startWeek" type="number" :min="startWeekMin" aria-label="Numéro de la semaine de début" required @change="onStartWeekChange">
                            <input id="start_year" v-model.number="startYear" type="number" :min="currentWeek.year" aria-label="Année de la semaine de début" required @change="onStartWeekChange">
                        </div>
                        <p id="start_week_dates" class="text-sm text-black/60">{{ startWeekLabel }}</p>
                    </div>

                    <!-- Semaine de fin : elle peut être l'année suivante -->
                    <div class="field">
                        <label for="end_week">Semaine de fin</label>
                        <div class="flex gap-2">
                            <input id="end_week" v-model.number="endWeek" type="number" :min="endWeekMin" aria-label="Numéro de la semaine de fin" required @change="onEndWeekChange">
                            <input id="end_year" v-model.number="endYear" type="number" :min="startYear" aria-label="Année de la semaine de fin" required @change="onEndWeekChange">
                        </div>
                        <p id="end_week_dates" class="text-sm text-black/60">{{ endWeekLabel }}</p>
                    </div>

                    <p v-if="errorMessage" class="card-error text-sm font-medium">{{ errorMessage }}</p>

                    <button class="btn-login" type="submit" :disabled="isSending">
                        {{ isSending ? "Réservation en cours..." : "Réserver la série" }}
                    </button>

                    <!-- Rapport de série : affiché après une demande acceptée par le backend -->
                    <div v-if="report" id="series_report" class="flex flex-col gap-2">
                        <!-- Tout est réservé : confirmation globale -->
                        <p v-if="report.failed.length === 0" class="card-success text-sm font-medium">
                            Toutes les dates de la série sont réservées ({{ report.booked.length }}).
                        </p>
                        <!-- Sinon : le nombre de dates obtenues, puis chaque date en échec avec son motif -->
                        <template v-else>
                            <p v-if="report.booked.length > 0" class="card-success text-sm font-medium">
                                Dates réservées : {{ report.booked.length }}
                            </p>
                            <div class="card-error text-sm font-medium">
                                <p>Dates non réservées : {{ report.failed.length }}</p>
                                <ul class="list-disc pl-5">
                                    <li v-for="occurrence in report.failed" :key="occurrence.date">
                                        {{ formatFailedDate(occurrence.date) }} : {{ failureReasonLabels[occurrence.reason] }}
                                    </li>
                                </ul>
                            </div>
                        </template>
                    </div>
                </div>
                <p v-else class="text-sm text-black/60">
                    La réservation ponctuelle n'est pas encore disponible : cochez « Répéter chaque semaine » pour réserver une série.
                </p>
            </form>
        </div>
    </div>
</template>
