import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";
import type { BookingSeriesService as BookingSeriesServiceType } from "../src/services/bookingSeriesService.js";

// Faux repository : on choisit ce que renvoie chaque requête
// sans toucher à la vraie base de données
const mockRepository = {
	findOneBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
	findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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
