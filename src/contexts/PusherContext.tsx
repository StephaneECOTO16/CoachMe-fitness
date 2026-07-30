"use client";

/**
 * PusherContext.tsx
 * Provides real-time messaging capabilities via Pusher Channels.
 * Manages Pusher connection lifecycle and channel subscriptions.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import Pusher, { Channel } from "pusher-js";
import { useAuth } from "./AuthContext";

interface PusherContextType {
  /** Pusher client instance */
  pusher: Pusher | null;
  /** Whether Pusher is connected */
  isConnected: boolean;
  /** Subscribe to a chat channel and receive messages */
  subscribeToChat: (
    coachProfileId: number,
    clientProfileId: number,
    onMessage: (message: Message) => void,
    onDeleted?: (messageIds: number[]) => void
  ) => () => void;
  /** Subscribe to the current user's personal notification feed */
  subscribeToNotifications: (
    userId: string,
    onNotification: (notification: AppNotification) => void
  ) => () => void;
}

export interface AppNotification {
  id: number;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Message {
  id: number;
  chatId: number;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    avatar: string | null;
  };
}

const PusherContext = createContext<PusherContextType | undefined>(undefined);

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pusher, setPusher] = useState<Pusher | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<Map<string, Channel>>(new Map());

  // Initialize Pusher connection when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Cleanup existing connection if user logs out
      if (pusher) {
        pusher.disconnect();
        setPusher(null);
        setIsConnected(false);
        channelsRef.current.clear();
      }
      return;
    }

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

    if (!pusherKey) {
      console.error("[Pusher] NEXT_PUBLIC_PUSHER_KEY is missing. Real-time features will not work.");
      return;
    }

    // Create new Pusher instance with authentication
    const pusherClient = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });

    // Handle connection state changes
    pusherClient.connection.bind("connected", () => {
      setIsConnected(true);
    });

    pusherClient.connection.bind("disconnected", () => {
      setIsConnected(false);
    });

    pusherClient.connection.bind("error", (error: { message?: string; type?: string; error?: unknown; status?: number; data?: { code?: string; message?: string } }) => {
      console.error("[Pusher] Connection error details:", {
        message: error?.message,
        type: error?.type,
        error: error?.error,
        status: error?.status,
        data: error?.data,
      });

      // Specific handling for Pusher-js internal error structure
      if (error?.data?.code) {
        console.error(`[Pusher] Error Code: ${error.data.code} - ${error.data.message}`);
      }

      setIsConnected(false);
    });

    setPusher(pusherClient);

    // Cleanup on unmount
    return () => {
      pusherClient.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  /**
   * Subscribe to a chat channel for real-time messages.
   * Returns an unsubscribe function.
   */
  const subscribeToChat = useCallback(
    (
      coachProfileId: number,
      clientProfileId: number,
      onMessage: (message: Message) => void,
      onDeleted?: (messageIds: number[]) => void
    ): (() => void) => {
      if (!pusher) {
        return () => { };
      }

      // Generate consistent channel name (same logic as server)
      const [min, max] =
        coachProfileId < clientProfileId
          ? [coachProfileId, clientProfileId]
          : [clientProfileId, coachProfileId];
      const channelName = `private-chat-${min}-${max}`;

      // Check if already subscribed
      let channel = channelsRef.current.get(channelName);
      if (!channel) {
        channel = pusher.subscribe(channelName);
        channelsRef.current.set(channelName, channel);
      }

      // Bind to new-message event
      const eventHandler = (data: { message: Message }) => {
        onMessage(data.message);
      };

      channel.bind("new-message", eventHandler);

      const deletedHandler = (data: { messageIds: number[] }) => {
        onDeleted?.(data.messageIds);
      };
      channel.bind("deleted-messages", deletedHandler);

      // Return unsubscribe function
      return () => {
        channel?.unbind("new-message", eventHandler);
        channel?.unbind("deleted-messages", deletedHandler);
      };
    },
    [pusher]
  );

  /**
   * Subscribe to the current user's personal notification channel.
   * Fires immediately (real time, down to the second) whenever the
   * backend creates a Notification row for this user.
   * Returns an unsubscribe function.
   */
  const subscribeToNotifications = useCallback(
    (
      userId: string,
      onNotification: (notification: AppNotification) => void
    ): (() => void) => {
      if (!pusher) {
        return () => { };
      }

      const channelName = `private-user-${userId}`;

      let channel = channelsRef.current.get(channelName);
      if (!channel) {
        channel = pusher.subscribe(channelName);
        channelsRef.current.set(channelName, channel);
      }

      const eventHandler = (data: AppNotification) => {
        onNotification(data);
      };

      channel.bind('new-notification', eventHandler);

      return () => {
        channel?.unbind('new-notification', eventHandler);
      };
    },
    [pusher]
  );

  const value: PusherContextType = {
    pusher,
    isConnected,
    subscribeToChat,
    subscribeToNotifications,
  };

  return (
    <PusherContext.Provider value={value}>{children}</PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
}
