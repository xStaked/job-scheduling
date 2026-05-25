import ExcelJS from "exceljs";

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
   Constantes de diseño
   ──────────────────────── */
const DAYS = ["Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Colores del tema */
const COLORS = {
  // Headers
  headerMainBg: "1e3a5f",      // Azul marino oscuro — título principal
  headerMainText: "ffffff",
  headerDayBg: "2563eb",       // Azul corporativo — días
  headerDayText: "ffffff",
  headerSubBg: "3b82f6",       // Azul más claro — sub-columnas
  headerSubText: "ffffff",

  // Datos empleado (columnas fijas)
  employeeBg: "f1f5f9",        // Gris azulado muy claro
  employeeText: "1e293b",

  // Alternancia de filas
  rowEven: "ffffff",
  rowOdd: "f8fafc",

  // Ausencias — fondo suave + texto fuerte
  vacaciones: { bg: "dcfce7", text: "166534" },
  incapacidad: { bg: "ffedd5", text: "9a3412" },
  permiso:     { bg: "dbeafe", text: "1e40af" },
  inasistencia:{ bg: "fee2e2", text: "991b1b" },

  // Turno adicional
  adicional: { bg: "fef9c3", text: "854d0e" },

  // Novedad presente
  novedadIndicator: "f59e0b",

  // Bordes
  border: "cbd5e1",
  borderHeader: "94a3b8",
} as const;

/** Anchos de columna en "caracteres Excel" */
const COL_WIDTHS = {
  puesto: 14,
  nombre: 26,
  unidadFija: 16,
  unidadRelevante: 16,
  turno: 11,
  ausencia: 13,
  novedad: 24,
  adicional: 9,
} as const;

/** Alto de fila de datos */
const DATA_ROW_HEIGHT = 28;

/* ────────────────────────
   Helpers de estilo
   ──────────────────────── */

function font(size: number, bold = false, color = "1e293b"): Partial<ExcelJS.Font> {
  return { name: "Calibri", size, bold, color: { argb: color } };
}

function fill(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function thinBorder(color: string): Partial<ExcelJS.Borders> {
  const b: ExcelJS.Border = { style: "thin", color: { argb: color } };
  return { top: b, bottom: b, left: b, right: b };
}

function alignment(
  horizontal: ExcelJS.Alignment["horizontal"] = "left",
  vertical: ExcelJS.Alignment["vertical"] = "middle",
  wrap = false
): Partial<ExcelJS.Alignment> {
  return { horizontal, vertical, wrapText: wrap };
}

/** Devuelve el estilo de celda para una ausencia */
function ausenciaStyle(ausencia: Ausencia): { fill: ExcelJS.Fill; font: Partial<ExcelJS.Font> } | null {
  switch (ausencia) {
    case "Vacaciones":
      return { fill: fill(COLORS.vacaciones.bg), font: font(10, false, COLORS.vacaciones.text) };
    case "Incapacidad":
      return { fill: fill(COLORS.incapacidad.bg), font: font(10, false, COLORS.incapacidad.text) };
    case "Permiso":
      return { fill: fill(COLORS.permiso.bg), font: font(10, false, COLORS.permiso.text) };
    case "Inasistencia":
      return { fill: fill(COLORS.inasistencia.bg), font: font(10, false, COLORS.inasistencia.text) };
    default:
      return null;
  }
}

/* ────────────────────────
   Exportación principal
   ──────────────────────── */

export async function exportToExcel(
  employees: Employee[],
  schedule: Record<number, WeekSchedule>,
  weekLabel: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Planificador de Turnos";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = `Semana ${weekLabel.replace(/[–\/]/g, "-")}`.slice(0, 31);
  const ws = workbook.addWorksheet(sheetName);

  /* ── 1. Configurar anchos de columna ── */
  ws.columns = [
    { key: "puesto", width: COL_WIDTHS.puesto },
    { key: "nombre", width: COL_WIDTHS.nombre },
    { key: "unidadFija", width: COL_WIDTHS.unidadFija },
    { key: "unidadRelevante", width: COL_WIDTHS.unidadRelevante },
    ...DAYS.flatMap(() => [
      { key: "turno", width: COL_WIDTHS.turno },
      { key: "ausencia", width: COL_WIDTHS.ausencia },
      { key: "novedad", width: COL_WIDTHS.novedad },
      { key: "adicional", width: COL_WIDTHS.adicional },
    ]),
  ];

  const totalCols = 4 + DAYS.length * 4; // 24 columnas

  /* ── 2. FILA 1: Título principal ── */
  const titleRow = ws.addRow([`HORARIO DE TURNOS "SUPERVISOR ROMERO" — Semana ${weekLabel}`]);
  titleRow.height = 36;
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.font = font(16, true, COLORS.headerMainText);
  titleCell.fill = fill(COLORS.headerMainBg);
  titleCell.alignment = alignment("center", "middle");
  titleCell.border = thinBorder(COLORS.borderHeader);

  /* ── 3. FILA 2: Metadatos ── */
  const metaRow = ws.addRow([
    `Generado: ${new Date().toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  ]);
  metaRow.height = 22;
  ws.mergeCells(2, 1, 2, totalCols);
  const metaCell = ws.getCell(2, 1);
  metaCell.font = font(9, false, "64748b");
  metaCell.alignment = alignment("center", "middle");
  metaCell.border = thinBorder(COLORS.border);

  /* ── 4. FILA 3: Header de días (merge) ── */
  ws.addRow([]); // fila vacía separadora (fila 3)
  const dayHeaderRow = ws.addRow([]);
  dayHeaderRow.height = 26;

  // Columnas fijas — fondo de empleado
  const fixedHeaders = ["PUESTO", "NOMBRE", "UNIDAD FIJA", "UNIDAD RELEVANTE"];
  fixedHeaders.forEach((h, idx) => {
    const cell = ws.getCell(4, idx + 1);
    cell.value = h;
    cell.font = font(10, true, COLORS.employeeText);
    cell.fill = fill(COLORS.employeeBg);
    cell.alignment = alignment("center", "middle");
    cell.border = thinBorder(COLORS.borderHeader);
  });

  // Headers de días — merge 4 celdas por día
  DAYS.forEach((day, dIdx) => {
    const startCol = 5 + dIdx * 4;
    const endCol = startCol + 3;
    ws.mergeCells(4, startCol, 4, endCol);
    const cell = ws.getCell(4, startCol);
    cell.value = day.toUpperCase();
    cell.font = font(11, true, COLORS.headerDayText);
    cell.fill = fill(COLORS.headerDayBg);
    cell.alignment = alignment("center", "middle");
    cell.border = thinBorder(COLORS.borderHeader);
    // Bordes en celdas mergeadas
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(4, c).border = thinBorder(COLORS.borderHeader);
    }
  });

  /* ── 5. FILA 5: Sub-headers (Turno, Ausencia, Novedad, Adic.) ── */
  const subHeaderRow = ws.addRow([]);
  subHeaderRow.height = 22;

  // Dejar las 4 primeras celdas con fondo empleado
  for (let c = 1; c <= 4; c++) {
    const cell = ws.getCell(5, c);
    cell.fill = fill(COLORS.employeeBg);
    cell.border = thinBorder(COLORS.borderHeader);
  }

  const subHeaders = ["Turno", "Ausencia", "Novedad", "Adic."];
  DAYS.forEach((_, dIdx) => {
    subHeaders.forEach((sh, sIdx) => {
      const col = 5 + dIdx * 4 + sIdx;
      const cell = ws.getCell(5, col);
      cell.value = sh;
      cell.font = font(9, true, COLORS.headerSubText);
      cell.fill = fill(COLORS.headerSubBg);
      cell.alignment = alignment("center", "middle");
      cell.border = thinBorder(COLORS.borderHeader);
    });
  });

  /* ── 6. FILAS DE DATOS ── */
  employees.forEach((emp, idx) => {
    const row = ws.addRow([]);
    row.height = DATA_ROW_HEIGHT;
    const isOdd = idx % 2 === 0;
    const baseBg = isOdd ? COLORS.rowOdd : COLORS.rowEven;

    // 6a. Columnas fijas del empleado
    const fixedValues = [emp.puesto, emp.nombre, emp.unidadFija, emp.unidadRelevante || "—"];
    fixedValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = font(10, cIdx === 1, COLORS.employeeText); // nombre en bold
      cell.fill = fill(COLORS.employeeBg);
      cell.alignment = alignment(cIdx === 1 ? "left" : "center", "middle");
      cell.border = thinBorder(COLORS.border);
    });

    // 6b. Datos por día
    DAYS.forEach((day, dIdx) => {
      const cellData = schedule[emp.id]?.[day];
      const colBase = 5 + dIdx * 4;

      // Turno
      const turnoCell = row.getCell(colBase);
      turnoCell.value = cellData?.turno || "—";
      turnoCell.font = font(10, false, "334155");
      turnoCell.fill = fill(baseBg);
      turnoCell.alignment = alignment("center", "middle");
      turnoCell.border = thinBorder(COLORS.border);

      // Ausencia (con color condicional)
      const ausenciaCell = row.getCell(colBase + 1);
      const aus = cellData?.ausencia || "";
      ausenciaCell.value = aus || "—";
      const ausStyle = ausenciaStyle(aus);
      if (ausStyle) {
        ausenciaCell.fill = ausStyle.fill;
        ausenciaCell.font = ausStyle.font;
      } else {
        ausenciaCell.fill = fill(baseBg);
        ausenciaCell.font = font(10, false, "334155");
      }
      ausenciaCell.alignment = alignment("center", "middle");
      ausenciaCell.border = thinBorder(COLORS.border);

      // Novedad
      const novedadCell = row.getCell(colBase + 2);
      const novedadText = cellData?.novedad || "";
      novedadCell.value = novedadText || "—";
      // Si hay novedad, fondo sutil amarillo + texto oscuro
      if (novedadText) {
        novedadCell.fill = fill("fefce8");
        novedadCell.font = font(10, false, "713f12");
      } else {
        novedadCell.fill = fill(baseBg);
        novedadCell.font = font(10, false, "94a3b8"); // gris para "—"
      }
      novedadCell.alignment = alignment("left", "middle", true);
      novedadCell.border = thinBorder(COLORS.border);

      // Adicional
      const adicCell = row.getCell(colBase + 3);
      const isAdic = !!cellData?.turnoAdicional;
      adicCell.value = isAdic ? "SÍ" : "—";
      if (isAdic) {
        adicCell.fill = fill(COLORS.adicional.bg);
        adicCell.font = font(10, true, COLORS.adicional.text);
      } else {
        adicCell.fill = fill(baseBg);
        adicCell.font = font(10, false, "94a3b8");
      }
      adicCell.alignment = alignment("center", "middle");
      adicCell.border = thinBorder(COLORS.border);
    });
  });

  /* ── 7. Freeze panes ── */
  // Congelar: filas 1-5 (título + headers) y columnas 1-4 (datos empleado)
  ws.views = [
    { state: "frozen", xSplit: 4, ySplit: 5, activeCell: "E6" },
  ];

  /* ── 8. AutoFilter ── */
  ws.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: totalCols },
  };

  /* ── 9. Congelar zoom a 100% y ajustar área de impresión ── */
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    printArea: `A1:${ws.getColumn(totalCols).letter}${ws.rowCount}`,
  };

  /* ── 10. Generar y descargar ── */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Horario_${weekLabel.replace(/[\s–\/]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
