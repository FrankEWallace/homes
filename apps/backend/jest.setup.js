// Minimal env so config/env.ts parses (it process.exit(1)s otherwise). These are
// never used to connect — unit tests mock Prisma/Redis or exercise pure logic.
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:4000/api/v1';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/homes_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars_long_xx';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long_x';
