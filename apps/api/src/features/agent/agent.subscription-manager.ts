import type { AgentStreamEvent } from "./agent.types.js";

type AgentEventListener = (event: AgentStreamEvent) => void;

type RedisSubscriberClient = {
  subscribe: (
    channel: string,
    listener: (message: string) => void,
  ) => Promise<unknown>;
  unsubscribe: (channel: string) => Promise<unknown>;
};

type AgentSubscriptionManagerDeps = {
  getClient: () => Promise<RedisSubscriberClient>;
};

export type AgentSubscriptionManager = ReturnType<
  typeof createAgentSubscriptionManager
>;

export const createAgentSubscriptionManager = ({
  getClient,
}: AgentSubscriptionManagerDeps) => {
  const listenersByChannel = new Map<string, Set<AgentEventListener>>();
  const subscribedChannels = new Set<string>();
  const subscribePromises = new Map<string, Promise<void>>();

  const ensureSubscribed = async (channel: string): Promise<void> => {
    if (subscribedChannels.has(channel)) {
      return;
    }

    const existingPromise = subscribePromises.get(channel);

    if (existingPromise) {
      await existingPromise;
      return;
    }

    const subscribePromise = (async () => {
      const client = await getClient();
      await client.subscribe(channel, (message: string) => {
        const listeners = listenersByChannel.get(channel);

        if (!listeners || listeners.size === 0) {
          return;
        }

        let event: AgentStreamEvent;
        try {
          event = JSON.parse(message) as AgentStreamEvent;
        } catch {
          console.error("Failed to parse agent event message", {
            channel,
            message,
          });
          return;
        }

        for (const listener of listeners) {
          listener(event);
        }
      });
      subscribedChannels.add(channel);
    })();

    subscribePromises.set(channel, subscribePromise);

    try {
      await subscribePromise;
      subscribePromises.delete(channel);
    } catch (error) {
      subscribePromises.delete(channel);
      throw error;
    }
  };

  const removeListener = async (
    channel: string,
    listener: AgentEventListener,
  ): Promise<void> => {
    const listeners = listenersByChannel.get(channel);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size > 0) {
      return;
    }

    listenersByChannel.delete(channel);
    subscribePromises.delete(channel);

    if (!subscribedChannels.has(channel)) {
      return;
    }

    const client = await getClient();
    await client.unsubscribe(channel);
    subscribedChannels.delete(channel);
  };

  return {
    subscribe: async ({
      channel,
      listener,
    }: {
      channel: string;
      listener: AgentEventListener;
    }) => {
      let listeners = listenersByChannel.get(channel);

      if (!listeners) {
        listeners = new Set<AgentEventListener>();
        listenersByChannel.set(channel, listeners);
      }

      listeners.add(listener);

      try {
        await ensureSubscribed(channel);
      } catch (error) {
        await removeListener(channel, listener);
        throw error;
      }

      return async () => removeListener(channel, listener);
    },
  };
};
