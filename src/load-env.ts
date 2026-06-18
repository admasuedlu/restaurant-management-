/**
 * Preload module — must run before any other app imports (via `tsx --import` / `node --import`).
 * ESM hoists static imports, so dotenv cannot run inside server.ts before database.ts loads.
 */
import dotenv from "dotenv";

dotenv.config();
