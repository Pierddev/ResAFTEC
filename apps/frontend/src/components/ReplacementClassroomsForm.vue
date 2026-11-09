<script setup lang="ts">
// Dates en échec d'une série : pour chacune, le formateur peut choisir
// une salle de remplacement libre sur le même créneau, ou ne pas la réserver.

import { onMounted, ref } from "vue";
import {
	type BookingSeriesReport,
	bookingSeriesService,
	type FailureReason,
	type ReplacementClassroom,
} from "@/services/bookingSeriesService";
import { toParisIsoDate } from "@/utils/parisDate";

// Le rapport de série reçu de la page de réservation
const props = defineProps<{
	report: BookingSeriesReport;
}>();

// Une ligne de la liste : une date en échec et la salle choisie pour elle
interface FailedDateRow {
	date: string; // début du cours en UTC, ex. : "2027-03-30T08:00:00.000Z"
	reason: FailureReason;
	classrooms: ReplacementClassroom[]; // salles libres sur le même créneau ce jour-là
	selectedClassroomId: number | null; // null = la date reste sans réservation
	errorMessage: string; // message du backend si la recherche a échoué
}

const rows = ref<FailedDateRow[]>([]);
// true pendant la recherche des salles
const isLoading = ref(false);

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
 * Construit le texte d'une salle dans la liste : on voit où elle se trouve.
 *
 * @param classroom - une salle de remplacement renvoyée par l'API
 * @returns le texte, ex. : "A201 – 30 places, Bâtiment A, étage 2"
 */
function formatClassroom(classroom: ReplacementClassroom): string {
	return `${classroom.name} – ${classroom.capacity} places, ${classroom.floor.building.name}, étage ${classroom.floor.level}`;
}

/**
 * Cherche les salles de remplacement de chaque date en échec du rapport.
 * Une demande au backend par date, l'une après l'autre.
 */
async function loadReplacementClassrooms() {
	isLoading.value = true;
	const newRows: FailedDateRow[] = [];

	for (const occurrence of props.report.failed) {
		// Au départ, aucune salle n'est choisie : la date reste sans réservation
		const row: FailedDateRow = {
			date: occurrence.date,
			reason: occurrence.reason,
			classrooms: [],
			selectedClassroomId: null,
			errorMessage: "",
		};

		try {
			row.classrooms = await bookingSeriesService.getReplacementClassrooms(
				props.report.series.id,
				// L'API attend la date du cours à Paris, ex. : "2027-03-30"
				toParisIsoDate(occurrence.date),
			);
		} catch (error) {
			// Ex. : "Cette occurrence a déjà commencé".
			// Les autres dates sont quand même cherchées.
			row.errorMessage = (error as { message: string }).message;
		}

		newRows.push(row);
	}

	rows.value = newRows;
	isLoading.value = false;
}

/**
 * Indique si une salle fait partie des salles libres d'une date.
 *
 * @param row - la ligne de la date
 * @param classroomId - l'id de la salle cherchée
 * @returns true si la salle est libre ce jour-là
 */
function isClassroomFree(row: FailedDateRow, classroomId: number): boolean {
	// some() renvoie true dès qu'une salle de la liste a cet id
	return row.classrooms.some((classroom) => classroom.id === classroomId);
}

/**
 * Indique si la salle choisie pour une date est aussi libre à une autre date en échec.
 * Sert à afficher le bouton « Appliquer cette salle aux autres dates ».
 *
 * @param row - la ligne de la date
 * @returns true si une salle est choisie et qu'elle est libre à au moins une autre date
 */
function isFreeOnOtherDates(row: FailedDateRow): boolean {
	const classroomId = row.selectedClassroomId;
	if (classroomId === null) {
		return false;
	}

	for (const otherRow of rows.value) {
		if (otherRow.date !== row.date && isClassroomFree(otherRow, classroomId)) {
			return true;
		}
	}
	return false;
}

/**
 * Choisit la salle d'une date pour toutes les autres dates où elle est libre,
 * même si une autre salle y était déjà choisie.
 * Les dates où elle n'est pas libre gardent leur choix.
 *
 * @param row - la ligne de la date dont on recopie la salle
 */
function applyToOtherDates(row: FailedDateRow) {
	const classroomId = row.selectedClassroomId;
	if (classroomId === null) {
		return;
	}

	for (const otherRow of rows.value) {
		if (otherRow.date !== row.date && isClassroomFree(otherRow, classroomId)) {
			otherRow.selectedClassroomId = classroomId;
		}
	}
}

// onMounted : on cherche les salles dès que le composant est affiché
onMounted(loadReplacementClassrooms);
</script>

<template>
    <div id="replacement_classrooms" class="flex flex-col gap-3">
        <div class="card-error text-sm font-medium">
            <p>Dates non réservées : {{ report.failed.length }}</p>
            <p>Choisissez une salle de remplacement pour chaque date, ou laissez « Ne pas réserver cette date ».</p>
        </div>

        <p v-if="isLoading" class="text-sm text-black/60">Recherche des salles de remplacement...</p>

        <!-- Une ligne par date en échec -->
        <template v-else>
            <div v-for="(row, index) in rows" :key="row.date" class="field">
                <label :for="`replacement_${index}`">
                    {{ formatFailedDate(row.date) }} : {{ failureReasonLabels[row.reason] }}
                </label>

                <!-- La recherche a échoué pour cette date -->
                <p v-if="row.errorMessage" class="card-error text-sm">{{ row.errorMessage }}</p>
                <!-- Aucune salle assez grande n'est libre ce jour-là -->
                <p v-else-if="row.classrooms.length === 0" class="text-sm text-black/60">
                    Aucune salle libre sur ce créneau
                </p>
                <!-- Salles libres, de la plus proche à la plus éloignée (tri fait par le backend) -->
                <select v-else :id="`replacement_${index}`" v-model="row.selectedClassroomId" class="border-2 border-black/30 w-full p-2 rounded-xl">
                    <option :value="null">Ne pas réserver cette date</option>
                    <option v-for="classroom in row.classrooms" :key="classroom.id" :value="classroom.id">
                        {{ formatClassroom(classroom) }}
                    </option>
                </select>

                <!-- Raccourci : seulement si la salle choisie est aussi libre à une autre date.
                     type="button" : sans lui, le clic enverrait le formulaire de la série
                     qui contient ce composant. -->
                <button v-if="isFreeOnOtherDates(row)" :id="`apply_${index}`" type="button" class="w-fit text-sm text-aftec-blue underline cursor-pointer" @click="applyToOtherDates(row)">
                    Appliquer cette salle aux autres dates
                </button>
            </div>
        </template>
    </div>
</template>
