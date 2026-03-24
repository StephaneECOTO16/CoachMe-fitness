import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/schemas';

const CreateDisciplineSchema = z.object({
    name: z.string().min(2, 'Discipline name is required and must be at least 2 characters'),
    imageKey: z.string({
        required_error: "Image is required",
        invalid_type_error: "Image is required",
    }).min(1, 'Image is required'),
});

export async function POST(req: Request) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, CreateDisciplineSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data) {
        return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }

    try {
        const discipline = await prisma.discipline.create({
            data: {
                name: data.name,
                imageUrl: data.imageKey,
            },
        });

        return NextResponse.json({ success: true, discipline });
    } catch (err: unknown) {
        console.error('Error creating discipline:', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}
