import { createClient } from "@libsql/client/web";
import type { Client } from "@libsql/client/web";

const TURSO_URL = import.meta.env.VITE_TURSO_URL || "";
const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN || "";

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    if (!TURSO_URL || !TURSO_TOKEN) {
      throw new Error("Faltan VITE_TURSO_URL o VITE_TURSO_TOKEN");
    }
    client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  return client;
}

export async function initDb() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      puesto TEXT NOT NULL,
      nombre TEXT NOT NULL,
      unidad_fija TEXT NOT NULL,
      unidad_relevante TEXT NOT NULL DEFAULT '',
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      week_label TEXT NOT NULL,
      day TEXT NOT NULL,
      turno TEXT NOT NULL DEFAULT '',
      ausencia TEXT NOT NULL DEFAULT '',
      novedad TEXT NOT NULL DEFAULT '',
      turno_adicional INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, week_label, day),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_schedules_week ON schedules(week_label)
  `);
}

export interface DbEmployee {
  id: number;
  puesto: string;
  nombre: string;
  unidad_fija: string;
  unidad_relevante: string;
  activo: number;
}

export interface DbSchedule {
  employee_id: number;
  week_label: string;
  day: string;
  turno: string;
  ausencia: string;
  novedad: string;
  turno_adicional: number;
}
