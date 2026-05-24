import { useState, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Search,
  X,
  Users,
  CheckCircle2,
  UserX,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ────────────────────────
   Tipos
   ──────────────────────── */
type Turno = "Diurno" | "Adicional" | "";
type Ausencia = "" | "Vacaciones" | "Incapacidad" | "Permiso" | "Inasistencia";

interface DaySchedule {
  turno: Turno;
  ausencia: Ausencia;
  novedad: string;
  turnoAdicional: boolean;
}

type WeekSchedule = Record<string, DaySchedule>;

interface Employee {
  id: number;
  puesto: string;
  nombre: string;
  unidadFija: string;
  unidadRelevante: string;
}

/* ────────────────────────
   Constantes
   ──────────────────────── */
const DAYS = ["Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TURNOS: Turno[] = ["Diurno", "Adicional", ""];
const AUSENCIAS: Ausencia[] = ["", "Vacaciones", "Incapacidad", "Permiso", "Inasistencia"];

const PUESTOS_PREDEFINIDOS = ["Operario", "Supervisor", "Conductor", "Auxiliar", "Mecánico"];
const UNIDADES_FIJAS = ["Bodega A", "Bodega B", "Oficina", "Flota 1", "Flota 2", "Planta"];

const initialEmployees: Employee[] = [
  { id: 1, puesto: "Operario", nombre: "Carlos Gómez", unidadFija: "Bodega A", unidadRelevante: "Zona Norte" },
  { id: 2, puesto: "Supervisor", nombre: "María López", unidadFija: "Oficina", unidadRelevante: "General" },
  { id: 3, puesto: "Conductor", nombre: "Andrés Ruiz", unidadFija: "Flota 1", unidadRelevante: "Ruta Sur" },
];

/* ────────────────────────
   Helpers
   ──────────────────────── */
function getCurrentWeekLabel(offset = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  const diffToTue = day === 0 ? -6 : 2 - day;
  const tue = new Date(now);
  tue.setDate(now.getDate() + diffToTue);
  const sat = new Date(tue);
  sat.setDate(tue.getDate() + 4);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(tue)} – ${fmt(sat)}/${sat.getFullYear()}`;
}

function makeWeekSchedule(): WeekSchedule {
  const s: WeekSchedule = {};
  DAYS.forEach((d) => {
    s[d] = { turno: "Diurno", ausencia: "", novedad: "", turnoAdicional: false };
  });
  return s;
}

function buildInitialSchedule(emps: Employee[]): Record<number, WeekSchedule> {
  const s: Record<number, WeekSchedule> = {};
  emps.forEach((e) => {
    s[e.id] = makeWeekSchedule();
  });
  return s;
}

function emptyForm() {
  return { puesto: "", nombre: "", unidadFija: "", unidadRelevante: "" };
}

/* ────────────────────────
   Componente
   ──────────────────────── */
export default function App() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [schedule, setSchedule] = useState<Record<number, WeekSchedule>>(() =>
    buildInitialSchedule(initialEmployees)
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const week = getCurrentWeekLabel(weekOffset);

  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [novedadDialogOpen, setNovedadDialogOpen] = useState(false);
  const [novedadTarget, setNovedadTarget] = useState<{ empId: number; day: string } | null>(null);
  const [novedadText, setNovedadText] = useState("");

  const [search, setSearch] = useState("");

  const nextId = useRef(employees.length + 1);

  /* ── Acciones ── */
  const changeWeek = useCallback((dir: number) => {
    setWeekOffset((prev) => prev + dir);
  }, []);

  const updateCell = useCallback(
    (empId: number, day: string, field: keyof DaySchedule, val: unknown) => {
      setSchedule((prev) => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          [day]: { ...prev[empId][day], [field]: val },
        },
      }));
    },
    []
  );

  const openNovedad = useCallback(
    (empId: number, day: string) => {
      setNovedadTarget({ empId, day });
      const cell = schedule[empId]?.[day];
      setNovedadText(cell?.novedad || "");
      setNovedadDialogOpen(true);
    },
    [schedule]
  );

  const saveNovedad = useCallback(() => {
    if (!novedadTarget) return;
    updateCell(novedadTarget.empId, novedadTarget.day, "novedad", novedadText);
    setNovedadDialogOpen(false);
    setNovedadText("");
    setNovedadTarget(null);
  }, [novedadTarget, novedadText, updateCell]);

  /* ── Validación de formulario ── */
  function validateForm() {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio.";
    if (!form.puesto.trim()) errs.puesto = "El puesto es obligatorio.";
    if (!form.unidadFija.trim()) errs.unidadFija = "La unidad fija es obligatoria.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function openAddEmp() {
    setEditEmp(null);
    setForm(emptyForm());
    setFormErrors({});
    setEmpDialogOpen(true);
  }

  function openEditEmp(emp: Employee) {
    setEditEmp(emp);
    setForm({
      puesto: emp.puesto,
      nombre: emp.nombre,
      unidadFija: emp.unidadFija,
      unidadRelevante: emp.unidadRelevante,
    });
    setFormErrors({});
    setEmpDialogOpen(true);
  }

  function saveEmp() {
    if (!validateForm()) return;
    if (editEmp) {
      setEmployees((prev) => prev.map((e) => (e.id === editEmp.id ? { ...e, ...form } : e)));
    } else {
      const id = nextId.current++;
      const newEmp: Employee = { id, ...form };
      setEmployees((prev) => [...prev, newEmp]);
      setSchedule((prev) => ({ ...prev, [id]: makeWeekSchedule() }));
    }
    setEmpDialogOpen(false);
  }

  function deleteEmp(id: number) {
    if (!window.confirm("¿Eliminar este empleado permanentemente?")) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setSchedule((prev) => {
      const s = { ...prev };
      delete s[id];
      return s;
    });
  }

  function exportCSV() {
    const header = [
      "Puesto",
      "Nombre",
      "Unidad Fija",
      "Unidad Relevante",
      ...DAYS.flatMap((d) => [`${d} Turno`, `${d} Ausencia`, `${d} Novedad`, `${d} T.Adicional`]),
    ];
    const rows = filtered.map((e) => {
      const base = [e.puesto, e.nombre, e.unidadFija, e.unidadRelevante];
      const days = DAYS.flatMap((d) => {
        const c = schedule[e.id]?.[d];
        return [
          c?.turno || "",
          c?.ausencia || "",
          c?.novedad || "",
          c?.turnoAdicional ? "Sí" : "No",
        ];
      });
      return [...base, ...days];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horario_${week.replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Datos derivados ── */
  const filtered = employees.filter(
    (e) =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.puesto.toLowerCase().includes(search.toLowerCase()) ||
      e.unidadFija.toLowerCase().includes(search.toLowerCase()) ||
      e.unidadRelevante.toLowerCase().includes(search.toLowerCase())
  );

  const totalPresentes = employees.filter(
    (e) => !DAYS.some((d) => schedule[e.id]?.[d]?.ausencia)
  ).length;
  const totalAusentes = employees.length - totalPresentes;
  const totalAdicionales = employees.reduce(
    (acc, e) => acc + DAYS.filter((d) => schedule[e.id]?.[d]?.turnoAdicional).length,
    0
  );

  return (
    <div className="mx-auto max-w-[1440px] p-6">
      <h2 className="sr-only">Planificador de turnos semanal para supervisor</h2>

      {/* ====== Header ====== */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Horario de turnos</h1>
          <p className="text-sm text-muted-foreground">Semana {week}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => changeWeek(-1)} title="Semana anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => changeWeek(1)} title="Semana siguiente">
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" onClick={openAddEmp}>
            <Plus className="size-4" /> Empleado
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* ====== Métricas ====== */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Users className="size-5 text-primary" />
              <span className="text-3xl font-bold">{employees.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Presentes hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span className="text-3xl font-bold text-emerald-600">{totalPresentes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ausentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UserX className="size-5 text-destructive" />
              <span className="text-3xl font-bold text-destructive">{totalAusentes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Turnos adicionales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="size-5 text-blue-600" />
              <span className="text-3xl font-bold text-blue-600">{totalAdicionales}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== Búsqueda ====== */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre, puesto o unidad…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ====== Tabla ====== */}
      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[90px]">Puesto</TableHead>
              <TableHead className="min-w-[140px]">Nombre</TableHead>
              <TableHead className="min-w-[110px]">U. Fija</TableHead>
              <TableHead className="min-w-[110px]">U. Relevante</TableHead>
              {DAYS.map((d) => (
                <TableHead key={d} colSpan={4} className="border-l text-center">
                  {d}
                </TableHead>
              ))}
              <TableHead className="min-w-[80px]">Acciones</TableHead>
            </TableRow>
            <TableRow>
              <TableHead colSpan={4} />
              {DAYS.map((d) =>
                (["Turno", "Ausencia", "Novedad", "+"] as const).map((sub, idx) => (
                  <TableHead
                    key={d + sub}
                    className="text-[10px] uppercase tracking-wider"
                    style={{ borderLeft: idx === 0 ? "1px solid hsl(var(--border))" : undefined }}
                  >
                    {sub}
                  </TableHead>
                ))
              )}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>{emp.puesto}</TableCell>
                <TableCell className="font-medium">{emp.nombre}</TableCell>
                <TableCell>{emp.unidadFija}</TableCell>
                <TableCell>{emp.unidadRelevante}</TableCell>
                {DAYS.map((d) => {
                  const c = schedule[emp.id]?.[d];
                  return [
                    <TableCell key={d + "t"} style={{ borderLeft: "1px solid hsl(var(--border))" }}>
                      <Select
                        value={c?.turno || "Diurno"}
                        onValueChange={(val) => updateCell(emp.id, d, "turno", val as Turno)}
                      >
                        <SelectTrigger className="h-7 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TURNOS.filter(Boolean).map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>,
                    <TableCell key={d + "a"}>
                      <Select
                        value={c?.ausencia || ""}
                        onValueChange={(val) => updateCell(emp.id, d, "ausencia", val as Ausencia)}
                      >
                        <SelectTrigger
                          className="h-7 w-[110px] text-xs"
                          style={{ color: c?.ausencia ? "hsl(var(--destructive))" : undefined }}
                        >
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {AUSENCIAS.map((a) => (
                            <SelectItem key={a} value={a} className="text-xs">
                              {a || "—"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>,
                    <TableCell key={d + "n"}>
                      <Button
                        variant={c?.novedad ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openNovedad(emp.id, d)}
                        title={c?.novedad || "Agregar novedad"}
                      >
                        {c?.novedad ? (
                          <Badge variant="outline" className="text-xs">
                            {c.novedad.length > 10 ? c.novedad.slice(0, 10) + "…" : c.novedad}
                          </Badge>
                        ) : (
                          <Plus className="size-3" />
                        )}
                      </Button>
                    </TableCell>,
                    <TableCell key={d + "x"} className="text-center">
                      <Checkbox
                        checked={!!c?.turnoAdicional}
                        onCheckedChange={(checked) =>
                          updateCell(emp.id, d, "turnoAdicional", checked === true)
                        }
                      />
                    </TableCell>,
                  ];
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditEmp(emp)}
                      title="Editar empleado"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteEmp(emp.id)}
                      title="Eliminar empleado"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={100} className="py-10 text-center text-muted-foreground">
                  No hay empleados que coincidan con tu búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ====== Dialog Empleado ====== */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEmp ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>
              Completa los datos del operario. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="puesto">Puesto *</Label>
              <Input
                id="puesto"
                list="puestos-list"
                value={form.puesto}
                onChange={(e) => setForm((f) => ({ ...f, puesto: e.target.value }))}
                placeholder="Ej: Operario"
                aria-invalid={!!formErrors.puesto}
              />
              <datalist id="puestos-list">
                {PUESTOS_PREDEFINIDOS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {formErrors.puesto && (
                <p className="text-xs text-destructive">{formErrors.puesto}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Juan Pérez"
                aria-invalid={!!formErrors.nombre}
              />
              {formErrors.nombre && (
                <p className="text-xs text-destructive">{formErrors.nombre}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="unidadFija">Unidad fija *</Label>
              <Input
                id="unidadFija"
                list="unidades-list"
                value={form.unidadFija}
                onChange={(e) => setForm((f) => ({ ...f, unidadFija: e.target.value }))}
                placeholder="Ej: Bodega A"
                aria-invalid={!!formErrors.unidadFija}
              />
              <datalist id="unidades-list">
                {UNIDADES_FIJAS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
              {formErrors.unidadFija && (
                <p className="text-xs text-destructive">{formErrors.unidadFija}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="unidadRelevante">Unidad relevante</Label>
              <Input
                id="unidadRelevante"
                value={form.unidadRelevante}
                onChange={(e) => setForm((f) => ({ ...f, unidadRelevante: e.target.value }))}
                placeholder="Ej: Zona Norte"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEmp}>{editEmp ? "Guardar cambios" : "Crear empleado"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== Dialog Novedad ====== */}
      <Dialog open={novedadDialogOpen} onOpenChange={setNovedadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar novedad</DialogTitle>
            <DialogDescription>
              {novedadTarget && (
                <>
                  <strong>
                    {employees.find((e) => e.id === novedadTarget.empId)?.nombre}
                  </strong>{" "}
                  — {novedadTarget.day}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={novedadText}
            onChange={(e) => setNovedadText(e.target.value)}
            rows={4}
            placeholder="Describe la novedad…"
            autoFocus
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setNovedadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveNovedad}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
