import { AppDataSource } from "../database/data-source.js";
import { User } from "../entity/User.entity.js";

export class UserService {
	async getAll(): Promise<User[]> {
		const userRepository = AppDataSource.getRepository(User);
		return await userRepository.find({
			relations: { role: true },
			select: {
				id: true,
				firstname: true,
				lastname: true,
				email: true,
				role: true,
			},
		});
	}
}
