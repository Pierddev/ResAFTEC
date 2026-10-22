# Changelog

## [0.4.0] - 2026-10-22

### Added
- **Admin routes**: Basic Auth middleware, `/admin` router and `GET /admin/users` endpoint
- **Password policy**: minimum length, common-password blocklist, login rate limiting
- **Session expiry handling**: 401 responses redirect to `/login`, navigation guard tests
- **Swagger UI** served at `/api/docs` (cookie and Basic auth schemes documented)

### Changed
- Password hashing migrated from bcrypt to Argon2id (OWASP settings, constant-time login, automatic rehash)
- Dependencies updated (Dependabot)

### Fixed
- `GET /admin/users` loads the role relation and no longer exposes passwords

### Upgrade notes
- Existing bcrypt hashes are no longer valid: run `npm run seed:dev` in `apps/backend` (resets the database)

## [0.3.0] - 2026-06-22

### Added
- **Role-User relationship**: bidirectional `OneToMany` mapping between entities

### Changed
- Biome configuration simplified with VCS git integration and `lint`/`format`/`check` npm scripts
- Node.js version requirement updated
- Hardcoded DB credentials replaced with environment variable placeholders

### Documentation
- Design maquettes added (zoning, wireframe, graphic charter)
- Test user credentials documented in README

## [0.2.0] - 2026-06-19

### Added
- **Booking system**: creation endpoint with conflict detection, retrieval by classroom
- **Building management**: retrieval endpoint with controller and service
- **Floor management**: retrieval endpoint by building ID
- **Classroom management**: retrieval by floor, dynamic cascade selectors
- **Equipment management**: retrieval by classroom endpoint
- **Frontend booking page** with building/floor/classroom cascade selectors
- **Landing page** replacing direct dashboard redirect
- **Auth guard**: refactored navigation guard, redirect authenticated users from public pages
- **Sidebar navigation** and authenticated layout
- **API migration**: query params → route params throughout
- **Swagger documentation** for Classroom, Building, Floor, Equipment, Booking entities and endpoints
- **Use case diagrams** for authentication, booking, and authorizations
- **MCD database diagram**
- **E2E testing**: Cypress configuration and release tests CI workflow
- **Frontend testing**: Vitest infrastructure, unit tests for auth store, classroom service, navigation sidebar
- **Backend testing**: unit tests for all services (Building, Classroom, Floor, Equipment, Booking, Profile, Index), controllers, authenticate middleware, Zod DTO schemas
- **Modular seeders** with incremental seeding
- **Postman collections** for new endpoints
- **Custom commands** reference in README, environment setup documentation

### Changed
- Project restructured into `apps/` monorepo (backend + frontend)
- OpenAPI spec integration
- Environment defaults updated

### Fixed
- UTC timezone in database connection and seed booking dates
- Classroom name prefix "Salle " removed from seed data
- Broken booking diagram reference

### Infrastructure
- Monorepo layout with shared root `package.json`
- Express 5, Vue 3, Tailwind CSS v4, Vitest, Cypress
- GitHub Actions: release tests workflow for `release/*` branches

## [0.1.0] - 2026-06-15

### Added
- **Authentication**: register, login, logout, JWT session restoration via `GET /api/me`
- **JWT middleware** with cookie-based token management
- **Role-based dashboard** routing and authentication guard
- **Frontend**: login/register pages with validation, Pinia auth store, Axios + Vite proxy
- **Backend**: TypeORM entities, database seeder (Faker), Zod DTOs
- **API documentation**: Swagger + Redoc via swagger-jsdoc
- **CI**: GitFlow workflow, Biome code quality checks, Jest test infrastructure
- **Entities**: équipements, réservations, rôles, utilisateurs

### Changed
- Routes standardisées sous le préfixe `/api`
- Table names en snake_case
- Refactored card layout utilities (frontend)

### Fixed
- API route consistency across backend and frontend proxy

### Infrastructure
- Express 5, Vue 3, Tailwind CSS v4, TypeORM, MySQL
- Postman collections for API testing
