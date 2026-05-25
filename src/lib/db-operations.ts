import { getDb } from "./db";
import type { DbEmployee, DbSchedule } from "./db";
export type { DbEmployee, DbSchedule };

/* ── Employees ── */
export async function getEmployees(): Promise<DbEmployee[]> {
  const db = getDb();
  const rs = await db.execute("SELECT * FROM employees WHERE activo = 1 ORDER BY id");
  return rs.rows.map((r) => ({
    id: r.id as number,
    puesto: r.puesto as string,
    nombre: r.nombre as string,
    unidad_fija: r.unidad_fija as string,
    unidad_relevante: r.unidad_relevante as string,
    activo: r.activo as number,
  }));
}

export async function createEmployee(emp: Omit<DbEmployee, "id" | "activo">): Promise<number> {
  const db = getDb();
  const rs = await db.execute({
    sql: "INSERT INTO employees (puesto, nombre, unidad_fija, unidad_relevante) VALUES (?, ?, ?, ?)",
    args: [emp.puesto, emp.nombre, emp.unidad_fija, emp.unidad_relevante],
  });
  return Number(rs.lastInsertRowid);
}

export async function updateEmployee(id: number, emp: Partial<Omit<DbEmployee, "id">>): Promise<void> {
  const db = getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (emp.puesto !== undefined) { sets.push("puesto = ?"); args.push(emp.puesto); }
  if (emp.nombre !== undefined) { sets.push("nombre = ?"); args.push(emp.nombre); }
  if (emp.unidad_fija !== undefined) { sets.push("unidad_fija = ?"); args.push(emp.unidad_fija); }
  if (emp.unidad_relevante !== undefined) { sets.push("unidad_relevante = ?"); args.push(emp.unidad_relevante); }
  if (emp.activo !== undefined) { sets.push("activo = ?"); args.push(emp.activo); }
  if (sets.length === 0) return;
  args.push(id);
  await db.execute({
    sql: `UPDATE employees SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteEmployee(id: number): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: "UPDATE employees SET activo = 0 WHERE id = ?",
    args: [id],
  });
}

/* ── Schedules ── */
export async function getSchedulesForWeek(weekLabel: string): Promise<DbSchedule[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM schedules WHERE week_label = ?",
    args: [weekLabel],
  });
  return rs.rows.map((r) => ({
    employee_id: r.employee_id as number,
    week_label: r.week_label as string,
    day: r.day as string,
    turno: r.turno as string,
    ausencia: r.ausencia as string,
    novedad: r.novedad as string,
    turno_adicional: r.turno_adicional as number,
  }));
}

export async function upsertSchedule(sch: DbSchedule): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO schedules (employee_id, week_label, day, turno, ausencia, novedad, turno_adicional)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, week_label, day) DO UPDATE SET
        turno = excluded.turno,
        ausencia = excluded.ausencia,
        novedad = excluded.novedad,
        turno_adicional = excluded.turno_adicional,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      sch.employee_id,
      sch.week_label,
      sch.day,
      sch.turno,
      sch.ausencia,
      sch.novedad,
      sch.turno_adicional,
    ],
  });
}

export async function seedInitialData() {
  const db = getDb();
  const count = await db.execute("SELECT COUNT(*) as c FROM employees");
  if ((count.rows[0]?.c as number) > 0) return;

  const initial = [
    { puesto: "Operario", nombre: "Carlos Gómez", unidad_fija: "Bodega A", unidad_relevante: "Zona Norte" },
    { puesto: "Supervisor", nombre: "María López", unidad_fija: "Oficina", unidad_relevante: "General" },
    { puesto: "Conductor", nombre: "Andrés Ruiz", unidad_fija: "Flota 1", unidad_relevante: "Ruta Sur" },
  ];

  for (const emp of initial) {
    await createEmployee(emp);
  }
}
