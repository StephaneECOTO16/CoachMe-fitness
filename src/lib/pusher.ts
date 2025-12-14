/**
 * src/lib/pusher.ts
 * Pusher Channels client for real-time chat messaging.
 * Handles authentication and message broadcasting between coaches and prospects.
 */

import PusherServer from 'pusher';

const pusher = new PusherServer({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || 'mt1',
    useTLS: true,
});

export { pusher };

/**
 * Channel name for 1:1 chat between coach and prospect.
 * Format: private-chat-{min(coachId, prospectId)}-{max(coachId, prospectId)}
 * Ensures channel is unique and ordered consistently.
 */
export function getChatChannelName(coachId: number, prospectId: number): string {
    const [min, max] = coachId < prospectId ? [coachId, prospectId] : [prospectId, coachId];
    return `private-chat-${min}-${max}`;
}

/**
 * Broadcast a message to a chat channel.
 */
export async function broadcastMessage(
    coachId: number,
    prospectId: number,
    event: string,
    data: Record<string, unknown>
): Promise<void> {
    const channel = getChatChannelName(coachId, prospectId);
    await pusher.trigger(channel, event, data);
}
