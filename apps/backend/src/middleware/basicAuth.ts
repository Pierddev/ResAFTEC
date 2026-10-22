import type { NextFunction, Request, Response } from "express";

export function basicAuth(req: Request, res: Response, next: NextFunction) {
	const auth = req.headers.authorization;

	if (auth) {
		const base64 = auth.split(" ")[1];

		if (base64) {
			const decodeAuth = atob(base64);

			const [user, pass] = decodeAuth.split(":");

			// Temporaire, pour test en attendant de configurer pour fonctionner avec jwt
			if (user === "admin" && pass === "Admin123!") {
				return next();
			}
		}
	}

	return res.status(401).json({ error: "Invalid credentials" });
}
