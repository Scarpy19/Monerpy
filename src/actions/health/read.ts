import { defineAction } from "astro:actions";
import { dbMode } from "@prisma/index.js";

// Simple health/status action exposing current database mode
const getHealth = defineAction({
    accept: 'json',
    handler: async () => {
        try {
            return { ok: true, dbMode };
        } catch (error) {
            console.error("Health check error:", error);
            return { ok: false, error: "Health check failed" };
        }
    }
});

export { getHealth };
