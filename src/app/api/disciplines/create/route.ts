import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/schemas';

const CreateDisciplineSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    imageKey: z.string().min(1, 'Image key is required'),
});

export async function POST(req: Request) {
    const payload = await requireAuth(req, ['ADMIN']);
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
