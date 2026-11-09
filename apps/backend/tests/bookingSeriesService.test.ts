import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import { LessThan, MoreThan, MoreThanOrEqual } from "typeorm";
import type { BookingSeries } from "../src/entity/BookingSeries.entity.js";
import type { BookingSeriesService as BookingSeriesServiceType } from "../src/services/bookingSeriesService.js";

// Faux repository : on choisit ce que renvoie chaque requête
// sans toucher à la vraie base de données
const mockRepository = {
	findOneBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	find: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	create: jest.fn((data: unknown) => data),
	save: jest.fn(async (data: unknown) => data),
};

// Fausse transaction : elle exécute directement le code qu'on lui donne
jest.unstable_mockModule("../src/database/data-source.js", () => ({
	AppDataSource: {
		getRepository: jest.fn(() => mockRepository),
		transaction: jest.fn((callback: (manager: unknown) => Promise<unknown>) =>
			callback({ getRepository: () => mockRepository }),
		),
	},
}));

const { BookingSeriesService } = await import(
	"../src/services/bookingSeriesService.js"
);

// Chaque mardi de 10h à 12h, du lundi 19 octobre au dimanche 8 novembre 2026
// → 3 occurrences : le 20 octobre, le 27 octobre et le 3 novembre
const dto = {
	title: "Cours de TypeScript",
	classroomId: 1,
	reservedForUserId: 2,
	dayOfWeek: 2,
	startTime: "10:00",
	endTime: "12:00",
	startDate: "2026-10-19",
	endDate: "2026-11-08",
};

describe("BookingSeriesService", () => {
	let bookingSeriesService: BookingSeriesServiceType;

	beforeEach(() => {
		bookingSeriesService = new BookingSeriesService();
		jest.clearAllMocks();
		// On fixe "maintenant" au 1er janvier 2026 : les 3 occurrences sont à venir
		jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });

		mockRepository.findOneBy
			.mockResolvedValueOnce({ id: 1 }) // la salle existe
			.mockResolvedValueOnce({ id: 2 }); // le bénéficiaire existe
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("should book free occurrences and report failed ones with their reason", async () => {
		mockRepository.findOne
			// 20 octobre : ni réservation, ni désactivation → libre
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
			// 27 octobre : une réservation existe déjà
			.mockResolvedValueOnce({ id: 99 })
			// 3 novembre : pas de réservation, mais la salle est désactivée
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: 5 });

		const result = await bookingSeriesService.create(dto, 1);

		expect(result.booked).toHaveLength(1);
		expect(result.booked[0]?.start_at).toEqual(
			new Date("2026-10-20T08:00:00Z"),
		);
		expect(result.failed).toEqual([
			{ date: new Date("2026-10-27T09:00:00Z"), reason: "already_booked" },
			{ date: new Date("2026-11-03T09:00:00Z"), reason: "disabled" },
		]);
	});

	it("should save the series even if every occurrence failed", async () => {
		// Une réservation existe déjà à chaque occurrence
		mockRepository.findOne.mockResolvedValue({ id: 99 });

		const result = await bookingSeriesService.create(dto, 1);

		expect(result.series.title).toBe("Cours de TypeScript");
		expect(mockRepository.save).toHaveBeenCalledWith(result.series);
		expect(result.booked).toEqual([]);
		expect(result.failed).toHaveLength(3);
	});
});

describe("BookingSeriesService - salles de remplacement", () => {
	let bookingSeriesService: BookingSeriesServiceType;

	// Salle principale : B101, 20 places, étage 10 du bâtiment 100
	const mainClassroom = {
		id: 1,
		name: "B101",
		capacity: 20,
		floor: { id: 10, building: { id: 100 } },
	};

	// La série telle que la base la renvoie : les heures ont des secondes
	const series = {
		id: 7,
		user: { id: 2 },
		classroom: mainClassroom,
		day_of_week: 2,
		start_time: "10:00:00",
		end_time: "12:00:00",
		start_date: "2026-10-19",
		end_date: "2026-11-08",
	} as unknown as BookingSeries;

	beforeEach(() => {
		bookingSeriesService = new BookingSeriesService();
		jest.clearAllMocks();
		// mockReset efface aussi les réponses programmées par les tests précédents
		mockRepository.findOne.mockReset();
		mockRepository.find.mockReset();
		jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("should find a series with its author, its beneficiary and its main classroom", async () => {
		mockRepository.findOne.mockResolvedValue(series);

		const result = await bookingSeriesService.findById(7);

		expect(result).toBe(series);
		expect(mockRepository.findOne).toHaveBeenCalledWith({
			where: { id: 7 },
			relations: {
				user: true,
				reservedForUser: true,
				classroom: { floor: { building: true } },
			},
		});
	});

	it("should return the free classrooms, the closest first", async () => {
		// La base renvoie les salles assez grandes, dans le désordre
		mockRepository.find.mockResolvedValue([
			mainClassroom,
			{ id: 2, name: "A001", floor: { id: 30, building: { id: 300 } } }, // autre bâtiment
			{ id: 3, name: "B201", floor: { id: 20, building: { id: 100 } } }, // même bâtiment
			{ id: 4, name: "B103", floor: { id: 10, building: { id: 100 } } }, // même étage
			{ id: 5, name: "B102", floor: { id: 10, building: { id: 100 } } }, // même étage
			{ id: 6, name: "B104", floor: { id: 10, building: { id: 100 } } }, // réservée
			{ id: 7, name: "B105", floor: { id: 10, building: { id: 100 } } }, // désactivée
		]);

		// Pour chaque salle, on cherche une réservation puis une désactivation.
		// La salle principale est ignorée : elle n'est pas vérifiée.
		mockRepository.findOne
			.mockResolvedValueOnce(null) // A001 : pas de réservation
			.mockResolvedValueOnce(null) // A001 : pas de désactivation
			.mockResolvedValueOnce(null) // B201
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null) // B103
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null) // B102
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: 99 }) // B104 : déjà réservée
			.mockResolvedValueOnce(null) // B105 : pas de réservation...
			.mockResolvedValueOnce({ id: 5 }); // ... mais désactivée

		const result = await bookingSeriesService.getReplacementClassrooms(
			series,
			"2026-11-03",
		);

		// Même étage (triées par nom), puis même bâtiment, puis le reste
		expect(result.map((classroom) => classroom.name)).toEqual([
			"B102",
			"B103",
			"B201",
			"A001",
		]);

		// Seules les salles d'au moins 20 places sont demandées à la base
		expect(mockRepository.find).toHaveBeenCalledWith({
			where: { capacity: MoreThanOrEqual(20) },
			relations: { floor: { building: true } },
		});

		// Le créneau vérifié est le mardi 3 novembre, 10h-12h à Paris (9h-11h UTC)
		expect(mockRepository.findOne).toHaveBeenCalledWith({
			where: {
				classroom: { id: 2 },
				start_at: LessThan(new Date("2026-11-03T11:00:00Z")),
				end_at: MoreThan(new Date("2026-11-03T09:00:00Z")),
			},
		});
	});

	it("should reject a date that is not an occurrence of the series", async () => {
		// Le 4 novembre est un mercredi, la série a lieu le mardi
		await expect(
			bookingSeriesService.getReplacementClassrooms(series, "2026-11-04"),
		).rejects.toThrow("La date ne tombe pas le jour de la série");

		// Aucune salle n'est cherchée
		expect(mockRepository.find).not.toHaveBeenCalled();
	});
});

describe("BookingSeriesService - réserver les occurrences en échec", () => {
	let bookingSeriesService: BookingSeriesServiceType;

	// Série créée par l'utilisateur 2 pour le bénéficiaire 3.
	// Chaque mardi de 10h à 12h, du 19 octobre au 8 novembre 2026.
	const series = {
		id: 7,
		title: "Cours de TypeScript",
		user: { id: 2 },
		reservedForUser: { id: 3 },
		classroom: { id: 1 },
		day_of_week: 2,
		start_time: "10:00:00",
		end_time: "12:00:00",
		start_date: "2026-10-19",
		end_date: "2026-11-08",
	} as unknown as BookingSeries;

	beforeEach(() => {
		bookingSeriesService = new BookingSeriesService();
		jest.clearAllMocks();
		// mockReset efface aussi les réponses programmées par les tests précédents
		mockRepository.findOneBy.mockReset();
		mockRepository.findOne.mockReset();
		jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });

		// Par défaut : les salles existent...
		mockRepository.findOneBy.mockResolvedValue({ id: 4 });
		// ... et elles sont libres (ni réservation, ni désactivation)
		mockRepository.findOne.mockResolvedValue(null);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("should book each occurrence in its chosen classroom and attach it to the series", async () => {
		// L'administrateur (id 1) réserve deux dates dans deux salles de remplacement
		const result = await bookingSeriesService.addOccurrences(
			series,
			[
				{ date: "2026-10-27", classroomId: 4 },
				{ date: "2026-11-03", classroomId: 6 },
			],
			1,
		);

		// Titre et bénéficiaire viennent de la série, l'auteur est la personne connectée.
		// 10h-12h à Paris = 9h-11h UTC (heure d'hiver depuis le 25 octobre).
		expect(result.booked).toEqual([
			{
				title: "Cours de TypeScript",
				user: { id: 1 },
				reservedForUser: { id: 3 },
				classroom: { id: 4 },
				series: { id: 7 },
				created_at: expect.any(Date),
				start_at: new Date("2026-10-27T09:00:00Z"),
				end_at: new Date("2026-10-27T11:00:00Z"),
			},
			{
				title: "Cours de TypeScript",
				user: { id: 1 },
				reservedForUser: { id: 3 },
				classroom: { id: 6 },
				series: { id: 7 },
				created_at: expect.any(Date),
				start_at: new Date("2026-11-03T09:00:00Z"),
				end_at: new Date("2026-11-03T11:00:00Z"),
			},
		]);
		expect(result.failed).toEqual([]);
		expect(mockRepository.save).toHaveBeenCalledWith(result.booked);
	});

	it("should report an occurrence whose classroom was taken in the meantime", async () => {
		mockRepository.findOne
			// 27 octobre : ni réservation, ni désactivation → libre
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
			// 3 novembre : quelqu'un a réservé la salle entre-temps
			.mockResolvedValueOnce({ id: 99 });

		const result = await bookingSeriesService.addOccurrences(
			series,
			[
				{ date: "2026-10-27", classroomId: 4 },
				{ date: "2026-11-03", classroomId: 6 },
			],
			2,
		);

		expect(result.booked).toHaveLength(1);
		expect(result.failed).toEqual([
			{ date: new Date("2026-11-03T09:00:00Z"), reason: "already_booked" },
		]);
	});

	it("should reject a date that is not an occurrence of the series, without booking anything", async () => {
		// Le 4 novembre est un mercredi, la série a lieu le mardi
		await expect(
			bookingSeriesService.addOccurrences(
				series,
				[
					{ date: "2026-10-27", classroomId: 4 },
					{ date: "2026-11-04", classroomId: 6 },
				],
				2,
			),
		).rejects.toThrow("La date ne tombe pas le jour de la série");

		// Même le 27 octobre, qui était valide, n'est pas réservé
		expect(mockRepository.save).not.toHaveBeenCalled();
	});

	it("should reject a classroom that does not exist, without booking anything", async () => {
		mockRepository.findOneBy.mockResolvedValue(null);

		await expect(
			bookingSeriesService.addOccurrences(
				series,
				[{ date: "2026-10-27", classroomId: 99 }],
				2,
			),
		).rejects.toThrow("La salle 99 n'existe pas.");

		expect(mockRepository.save).not.toHaveBeenCalled();
	});
});
