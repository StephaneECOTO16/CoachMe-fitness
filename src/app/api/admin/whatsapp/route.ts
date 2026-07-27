import { NextResponse } from 'next/server';
import { requireAuth, unauthorised } from '@/lib/auth';
import { 
    getWhatsAppStatus, 
    createWhatsAppInstance, 
    connectWhatsAppInstance, 
    logoutWhatsAppInstance 
} from '@/lib/evolution';

export async function GET(req: Request) {
    try {
        const session = await requireAuth(req, { allowedRoles: ["ADMIN"] });
        if (!session) return unauthorised();

        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        if (action === 'status') {
            const status = await getWhatsAppStatus();
            return NextResponse.json(status);
        }

        if (action === 'connect') {
            // Check if instance exists first
            const status = await getWhatsAppStatus();
            if (status.status === "not_created") {
                await createWhatsAppInstance();
            }
            
            const qrCodeData = await connectWhatsAppInstance();
            return NextResponse.json(qrCodeData);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("WhatsApp API GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await requireAuth(req, { allowedRoles: ["ADMIN"] });
        if (!session) return unauthorised();

        await logoutWhatsAppInstance();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("WhatsApp API DELETE Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
