/**
 * GET /api/admin/users/export?format=xlsx|csv|pdf&view=active|deleted&search=...&locale=fr|en
 *
 * Admin-only download of the user list as Excel (.xlsx), CSV or PDF.
 * Uses the same filters as the admin users page, without pagination.
 * The file contains personal data (emails, phone numbers): every export
 * is logged with the requesting admin's id.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { listUsersForExport } from "@/services/admin.service";
import { buildXlsx, XLSX_CONTENT_TYPE } from "@/lib/xlsx";
import { buildCsv } from "@/lib/csv";
import { buildPdfTable } from "@/lib/pdf-table";

/** Dates are shown in the platform's local time (Cameroon, UTC+1, no DST). */
const EXPORT_TIME_ZONE = "Africa/Douala";

const LABELS = {
  fr: {
    sheet: "Utilisateurs",
    file: "utilisateurs",
    deletedSuffix: "-supprimes",
    title: "Utilisateurs CoachMe",
    viewActive: "Comptes actifs",
    viewDeleted: "Comptes supprimés",
    count: (n: number) => `${n} utilisateur${n > 1 ? "s" : ""}`,
    exportedOn: "Exporté le",
    search: "Recherche",
    page: "Page",
    columns: {
      name: "Nom", email: "Email", phone: "Téléphone", role: "Rôle",
      discipline: "Discipline", status: "Statut coach", experience: "Expérience (ans)",
      city: "Ville", country: "Pays", account: "Compte",
      createdAt: "Inscrit le", deletedAt: "Supprimé le",
    },
    role: { PROSPECT: "Client", COACH: "Coach", ADMIN: "Admin" },
    status: { PENDING: "En attente", APPROVED: "Approuvé", REJECTED: "Refusé" },
    account: { active: "Actif", disabled: "Désactivé", deleted: "Supprimé" },
  },
  en: {
    sheet: "Users",
    file: "users",
    deletedSuffix: "-deleted",
    title: "CoachMe users",
    viewActive: "Active accounts",
    viewDeleted: "Deleted accounts",
    count: (n: number) => `${n} user${n > 1 ? "s" : ""}`,
    exportedOn: "Exported on",
    search: "Search",
    page: "Page",
    columns: {
      name: "Name", email: "Email", phone: "Phone", role: "Role",
      discipline: "Discipline", status: "Coach status", experience: "Experience (years)",
      city: "City", country: "Country", account: "Account",
      createdAt: "Signed up", deletedAt: "Deleted",
    },
    role: { PROSPECT: "Client", COACH: "Coach", ADMIN: "Admin" },
    status: { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" },
    account: { active: "Active", disabled: "Disabled", deleted: "Deleted" },
  },
} as const;

type ColumnKey = keyof (typeof LABELS)["fr"]["columns"];

/** Column order, Excel width and PDF weight. PDF keeps the most useful columns. */
const COLUMNS: { key: ColumnKey; width: number; pdfWeight?: number }[] = [
  { key: "name", width: 26, pdfWeight: 17 },
  { key: "email", width: 32, pdfWeight: 23 },
  { key: "phone", width: 18, pdfWeight: 13 },
  { key: "role", width: 10, pdfWeight: 7 },
  { key: "discipline", width: 18, pdfWeight: 12 },
  { key: "status", width: 14, pdfWeight: 10 },
  { key: "experience", width: 16 },
  { key: "city", width: 16 },
  { key: "country", width: 16 },
  { key: "account", width: 12, pdfWeight: 8 },
  { key: "createdAt", width: 18, pdfWeight: 12 },
  { key: "deletedAt", width: 18, pdfWeight: 12 },
];

const FORMATS = {
  xlsx: { contentType: XLSX_CONTENT_TYPE, ext: "xlsx" },
  csv: { contentType: "text/csv; charset=utf-8", ext: "csv" },
  pdf: { contentType: "application/pdf", ext: "pdf" },
} as const;

type ExportFormat = keyof typeof FORMATS;

function formatDate(date: Date, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: EXPORT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Excel dates have no time zone: shift the instant so the cell shows the
 * platform's local wall-clock time instead of UTC.
 */
function toLocalWallClock(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EXPORT_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")));
}

export async function GET(req: Request) {
  const payload = await requireAuth(req, { allowedRoles: ["ADMIN"] });
  if (!payload) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const requested = url.searchParams.get("format");
    const format: ExportFormat = requested === "csv" || requested === "pdf" ? requested : "xlsx";
    const view = url.searchParams.get("view") === "deleted" ? "deleted" : "active";
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
    const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
    const l = LABELS[locale];

    const users = await listUsersForExport({ search, view });

    // Only show "Deleted on" when looking at deleted accounts.
    const columns = COLUMNS.filter((c) => c.key !== "deletedAt" || view === "deleted");

    const records = users.map((u) => {
      const coach = u.coachProfile;
      const values: Record<ColumnKey, string | number | Date | null> = {
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: l.role[u.role],
        discipline: coach?.discipline?.name ?? null,
        status: coach ? l.status[coach.status] : null,
        experience: coach?.experienceYears ?? null,
        city: coach?.city ?? null,
        country: coach?.country ?? null,
        account: u.deletedAt ? l.account.deleted : u.isActive ? l.account.active : l.account.disabled,
        createdAt: u.createdAt,
        deletedAt: u.deletedAt,
      };
      return values;
    });

    let file: Buffer;
    if (format === "xlsx") {
      file = buildXlsx({
        sheetName: l.sheet,
        columns: columns.map((c) => ({ header: l.columns[c.key], width: c.width })),
        rows: records.map((r) =>
          columns.map((c) => {
            const v = r[c.key];
            return v instanceof Date ? toLocalWallClock(v) : v;
          }),
        ),
      });
    } else if (format === "csv") {
      file = buildCsv(
        columns.map((c) => l.columns[c.key]),
        records.map((r) =>
          columns.map((c) => {
            const v = r[c.key];
            return v instanceof Date ? formatDate(v, locale) : v;
          }),
        ),
        // French Excel expects ";" as the list separator, English Excel ",".
        locale === "fr" ? ";" : ",",
      );
    } else {
      const pdfColumns = columns.filter((c) => c.pdfWeight);
      const subtitle = [
        view === "deleted" ? l.viewDeleted : l.viewActive,
        l.count(users.length),
        search ? `${l.search} : "${search}"` : null,
        `${l.exportedOn} ${formatDate(new Date(), locale)}`,
      ]
        .filter(Boolean)
        .join("  ·  ");
      file = buildPdfTable({
        title: l.title,
        subtitle,
        pageLabel: l.page,
        columns: pdfColumns.map((c) => ({ header: l.columns[c.key], weight: c.pdfWeight! })),
        rows: records.map((r) =>
          pdfColumns.map((c) => {
            const v = r[c.key];
            if (v === null || v === undefined) return null;
            return v instanceof Date ? formatDate(v, locale) : String(v);
          }),
        ),
      });
    }

    const date = new Date().toISOString().slice(0, 10);
    const suffix = view === "deleted" ? l.deletedSuffix : "";
    const filename = `${l.file}${suffix}-${date}.${FORMATS[format].ext}`;

    logger.info(
      { adminId: payload.userId, format, view, search: Boolean(search), count: users.length },
      "Admin exported user list",
    );

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": FORMATS[format].contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(file.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({ error, adminId: payload.userId }, "User export failed");
    return NextResponse.json(
      { success: false, error: { code: "EXPORT_FAILED", message: "Export failed" } },
      { status: 500 },
    );
  }
}
