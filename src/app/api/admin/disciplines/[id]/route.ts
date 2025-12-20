import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/schemas';

const UpdateDisciplineSchema = z.object({
    name: z.string().min(2).optional(),
    imageKey: z.string().optional(),
});

/**
 * PATCH /api/admin/disciplines/[id]
 * Update a discipline (admin only).
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    const { id } = await params;
    const disciplineId = parseInt(id);

    if (isNaN(disciplineId)) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid ID' } }, { status: 400 });
    }

    const { data, error } = await parseRequestBody(req, UpdateDisciplineSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    try {
        const updateData: any = {};
        if (data?.name) updateData.name = data.name;
        if (data?.imageKey) updateData.imageUrl = data.imageKey;

        const discipline = await prisma.discipline.update({
            where: { id: disciplineId },
            data: updateData,
        });

        return NextResponse.json({ success: true, discipline });
    } catch (err: any) {
        console.error(`[PATCH /api/admin/disciplines/${id}]`, err);
        if (err.code === 'P2025') {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Discipline not found' } }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/disciplines/[id]
 * Delete a discipline (admin only).
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const payload = await requireAuth(req, ['ADMIN']);
    if (!payload) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    const { id } = await params;
    const disciplineId = parseInt(id);

    if (isNaN(disciplineId)) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid ID' } }, { status: 400 });
    }

    try {
        // Check if there are any coaches using this discipline first
        const coachCount = await prisma.coachProfile.count({
            where: { disciplineId: disciplineId }
        });

        if (coachCount > 0) {
            return NextResponse.json({
                success: false,
                error: {
                    code: 'CONFLICT',
                    message: 'Cannot delete discipline with associated coaches. Reassign or remove coaches first.'
                }
            }, { status: 409 });
        }

        await prisma.discipline.delete({
            where: { id: disciplineId },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error(`[DELETE /api/admin/disciplines/${id}]`, err);
        if (err.code === 'P2025') {
            return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Discipline not found' } }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}
