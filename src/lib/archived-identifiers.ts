/**
 * Releasing the email / phone of admin-deleted (soft-deleted) accounts.
 *
 * Soft-deleted users keep their row so an admin can restore them, which
 * means their email and phone would otherwise stay "taken" forever (both
 * columns are UNIQUE). When someone registers again with those identifiers,
 * we *archive* them on the deleted row instead of blocking the signup:
 *
 *   "jane@mail.com"  →  "deleted:<userId>:jane@mail.com"
 *
 * The encoding is reversible (restoreUser() strips it back) and unique per
 * user, so no schema change is needed. An archived value can never match a
 * real login identifier, so the deleted account stays unreachable.
 */

import type { Prisma, UserRole } from "@prisma/client";

const PREFIX = "deleted:";
const UUID_LENGTH = 36;

export function archiveIdentifier(userId: string, value: string): string {
  return `${PREFIX}${userId}:${value}`;
}

export function isArchivedIdentifier(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(PREFIX));
}

/** Returns the original value of an archived identifier (or the value itself). */
export function originalIdentifier<T extends string | null>(value: T): T {
  if (!value || !value.startsWith(PREFIX)) return value;
  return value.slice(PREFIX.length + UUID_LENGTH + 1) as T;
}

type Db = Prisma.TransactionClient;

/**
 * Makes `email` / `phone` available for a new or converted account of `role`.
 * Email and phone are unique per role, so only accounts of the same role
 * can conflict (a client account never blocks a coach signup).
 * - Held by an active (non-deleted) account of that role → throws a 409.
 * - Held by an admin-deleted account of that role        → archived, freeing it.
 *
 * Call inside the same transaction that writes the new identifiers.
 */
export async function releaseIdentifiersFromDeletedUsers(
  db: Db,
  {
    email,
    phone,
    role,
    exceptUserId,
  }: { email?: string | null; phone?: string | null; role: UserRole; exceptUserId?: string }
): Promise<void> {
  const or: Prisma.UserWhereInput[] = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  if (or.length === 0) return;

  const holders = await db.user.findMany({
    where: { role, OR: or, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
    select: { id: true, email: true, phone: true, deletedAt: true },
  });

  // Active holders always win — check them all before archiving anything.
  for (const h of holders) {
    if (h.deletedAt) continue;
    if (email && h.email === email) {
      throw Object.assign(new Error("An account with this email already exists for this role"), {
        code: "ALREADY_EXISTS",
        status: 409,
      });
    }
    if (phone && h.phone === phone) {
      throw Object.assign(new Error("An account with this phone number already exists for this role"), {
        code: "PHONE_ALREADY_EXISTS",
        status: 409,
      });
    }
  }

  for (const h of holders) {
    if (!h.deletedAt) continue;
    await db.user.update({
      where: { id: h.id },
      data: {
        ...(email && h.email === email ? { email: archiveIdentifier(h.id, h.email) } : {}),
        ...(phone && h.phone === phone ? { phone: archiveIdentifier(h.id, h.phone) } : {}),
      },
    });
  }
}
