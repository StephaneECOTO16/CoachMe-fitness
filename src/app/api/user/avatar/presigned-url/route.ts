import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateAvatarPresignedUrl } from '@/lib/aws-s3';

export async function POST(req: Request) {
  const payload = await requireAuth(req, undefined, { checkCoachStatus: false });
  if (!payload) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { fileName, mimeType, fileSize } = body;

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'fileName, mimeType, and fileSize required',
          },
        },
        { status: 400 }
      );
    }

    const presigned = await generateAvatarPresignedUrl(
      fileName,
      mimeType,
      payload.userId,
      fileSize
    );

    return NextResponse.json({ success: true, presignedUrl: presigned });
  } catch (err: any) {
    console.error('[POST /api/user/avatar/presigned-url]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_INPUT', message: err.message },
      },
      { status: 400 }
    );
  }
}

