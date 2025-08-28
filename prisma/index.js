// Db
import
{
    PrismaClient
}
from '@prisma/client';
import
{
    PrismaLibSQL
}
from '@prisma/adapter-libsql';

const urlenv =
    import.meta.env.SECRET_TURSO_DATABASE_URL || process.env.SECRET_TURSO_DATABASE_URL;
const authTokenEnv =
    import.meta.env.SECRET_TURSO_AUTH_TOKEN || process.env.SECRET_TURSO_AUTH_TOKEN;

// Flag to allow the rest of the app to know if DB config is present
const missingTursoConfig = !urlenv || !authTokenEnv;

/** @type {import('@prisma/client').PrismaClient} */
let prisma;
let dbMode = 'local'; // 'local' | 'turso'

if (missingTursoConfig)
{
    // Local fallback (uses datasource in schema.prisma -> file:./dev.db)
    console.warn('[Config] Turso env vars missing. Falling back to local SQLite file dev.db');
    prisma = new PrismaClient();
}
else
{
    const adapter = new PrismaLibSQL({
        url: urlenv,
        authToken: authTokenEnv
    });
    prisma = new PrismaClient({ adapter });
    dbMode = 'turso';
}

export { prisma, missingTursoConfig, dbMode };