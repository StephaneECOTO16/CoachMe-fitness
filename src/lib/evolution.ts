import { logger } from "@/lib/logger";

const API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const API_KEY = process.env.EVOLUTION_API_KEY || "YOUR_GLOBAL_API_KEY";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "coachme";

const headers = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
};

/**
 * Fetch instance state to check if connected or needs QR code.
 */
export async function getWhatsAppStatus() {
    try {
        const response = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            method: 'GET',
            headers
        });
        
        if (response.status === 404) {
            return { status: "not_created" };
        }
        
        const data = await response.json();
        return { status: data.instance?.state || "unknown" };
    } catch (err: any) {
        logger.error({ err }, "Evolution API error");
        return { status: "error", message: err.message };
    }
}

/**
 * Create instance if not exists and get QR Code.
 */
export async function createWhatsAppInstance() {
    try {
        const response = await fetch(`${API_URL}/instance/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                instanceName: INSTANCE_NAME,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });
        
        const data = await response.json();
        return data;
    } catch (err: any) {
        logger.error({ err }, "Evolution API create instance error");
        throw err;
    }
}

/**
 * Connect to instance and return QR code.
 */
export async function connectWhatsAppInstance() {
    try {
        const response = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
            method: 'GET',
            headers
        });
        const data = await response.json();
        // The API returns a base64 QR code if it needs scanning
        return data;
    } catch (err: any) {
        logger.error({ err }, "Evolution API connect instance error");
        throw err;
    }
}

/**
 * Logout the instance.
 */
export async function logoutWhatsAppInstance() {
    try {
        const response = await fetch(`${API_URL}/instance/logout/${INSTANCE_NAME}`, {
            method: 'DELETE',
            headers
        });
        return await response.json();
    } catch (err: any) {
        logger.error({ err }, "Evolution API logout instance error");
        throw err;
    }
}

/**
 * Send a WhatsApp message.
 */
export async function sendWhatsAppMessage(phone: string, text: string) {
    try {
        // Format phone number: remove non-digits, ensure it has country code
        let formattedPhone = phone.replace(/\D/g, "");
        if (!formattedPhone) return;

        const response = await fetch(`${API_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                number: formattedPhone,
                text: text,
                delay: 1200
            })
        });
        
        const data = await response.json();
        return data;
    } catch (err: any) {
        logger.error({ err, phone }, "Failed to send WhatsApp message");
    }
}
