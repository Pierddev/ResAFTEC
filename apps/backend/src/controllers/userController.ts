import type { Response } from "express";
import type { AuthRequest } from "../middleware/authenticate.js";
import { UserService } from "../services/userService.js";

export class UserController {
	async getAll(_req: AuthRequest, res: Response) {
		try {
			const userService = new UserService();
			const users = await userService.getAll();
			return res.status(200).json({ users });
		} catch (error) {
			return res.status(500).json({ message: (error as Error).message });
		}
	}
}
