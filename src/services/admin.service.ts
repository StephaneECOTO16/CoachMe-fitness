/**
 * src/services/admin.service.ts
 *
 * Business logic for admin dashboard: stats, user management,
 * discipline CRUD, and paginated data fetching.
 */

import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPublicUrl, deleteFromStorage } from "@/lib/storage";

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [
    totalUsers,
    totalProspects,
    totalCoaches,
    totalAdmins,
    pendingCoaches,
    approvedCoaches,
    rejectedCoaches,
    totalChats,
    totalMessages,
    topDisciplines,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PROSPECT" } }),
    prisma.user.count({ where: { role: "COACH" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.coachProfile.count({ where: { status: "PENDING" } }),
    prisma.coachProfile.count({ where: { status: "APPROVED" } }),
    prisma.coachProfile.count({ where: { status: "REJECTED" } }),
    prisma.chat.count(),
    prisma.message.count(),
    prisma.discipline.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        _count: { select: { coaches: { where: { status: "APPROVED" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalUsers,
    totalProspects,
    totalCoaches,
    totalAdmins,
    pendingCoaches,
    approvedCoaches,
    rejectedCoaches,
    totalChats,
    totalMessages,
    disciplines: topDisciplines.map((d) => ({
      id: d.id,
      name: d.name,
      imageUrl: d.imageUrl ? getPublicUrl(d.imageUrl) : null,
      coachCount: d._count.coaches,
    })),
  };
}

// ─── User management ──────────────────────────────────────────────────────────

/**
 * Returns a paginated list of all non-admin users with role-specific context.
 */
export async function listUsers(options: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { search = "", page = 1, limit = 25 } = options;
  const offset = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    role: { in: ["COACH", "PROSPECT"] as UserRole[] },
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true,
        coachProfile: {
          select: {
            id: true,
            status: true,
            discipline: { select: { name: true } },
            experienceYears: true,
          },
        },
        clientProfile: {
          select: { goals: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      ...u,
      avatar: u.avatar ? getPublicUrl(u.avatar) : null,
      specialty: u.coachProfile?.discipline?.name ?? null,
      status: u.coachProfile?.status ?? null,
      coachId: u.coachProfile?.id ?? null,
      goals: u.clientProfile?.goals ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Deletes a non-admin user and all their data.
 * Prevents deletion of ADMIN accounts.
 */
export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, avatar: true },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND", status: 404 });
  }

  if (user.role === "ADMIN") {
    throw Object.assign(new Error("Cannot delete admin accounts"), {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  // Cascade deletes handle all related records via Prisma schema
  await prisma.user.delete({ where: { id: userId } });

  // Clean up avatar from R2 after DB deletion
  if (user.avatar) await deleteFromStorage(user.avatar);

  logger.info({ userId }, "User deleted by admin");
}

// ─── Discipline management ────────────────────────────────────────────────────

export async function listDisciplines(options: { search?: string; page?: number; limit?: number } = {}) {
  const { search = "", page = 1, limit = 25 } = options;
  const offset = (page - 1) * limit;

  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const [disciplines, total] = await prisma.$transaction([
    prisma.discipline.findMany({
      where,
      include: {
        _count: { select: { coaches: { where: { status: "APPROVED" } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.discipline.count({ where }),
  ]);

  return {
    disciplines: disciplines.map((d) => ({
      id: d.id,
      name: d.name,
      imageUrl: d.imageUrl ? getPublicUrl(d.imageUrl) : null,
      coachCount: d._count.coaches,
      createdAt: d.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createDiscipline(name: string, imageKey: string) {
  const discipline = await prisma.discipline.create({
    data: { name, imageUrl: imageKey },
  });
  logger.info({ disciplineId: discipline.id, name }, "Discipline created");
  return discipline;
}

export async function updateDiscipline(
  id: number,
  data: { name?: string; imageKey?: string }
) {
  const current = await prisma.discipline.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  const updated = await prisma.discipline.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.imageKey && { imageUrl: data.imageKey }),
    },
  });

  // Delete old R2 image if replaced
  if (data.imageKey && current?.imageUrl && current.imageUrl !== data.imageKey) {
    await deleteFromStorage(current.imageUrl);
  }

  logger.info({ disciplineId: id }, "Discipline updated");
  return updated;
}

export async function deleteDiscipline(id: number) {
  const coachCount = await prisma.coachProfile.count({
    where: { disciplineId: id },
  });

  if (coachCount > 0) {
    throw Object.assign(
      new Error(`Cannot delete discipline with ${coachCount} assigned coach(es)`),
      { code: "CONFLICT", status: 409 }
    );
  }

  const discipline = await prisma.discipline.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  await prisma.discipline.delete({ where: { id } });

  if (discipline?.imageUrl) await deleteFromStorage(discipline.imageUrl);

  logger.info({ disciplineId: id }, "Discipline deleted");
}
