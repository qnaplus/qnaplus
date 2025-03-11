/**
 * Realtime handler for keeping connections alive since it's apparently more complicated than one might think.
 * Pulled from: https://gist.github.com/Cikmo/bcba91318ba19dae1f914b32bf2b94b2
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "pino";

import { REALTIME_SUBSCRIBE_STATES } from "@supabase/realtime-js";

export type Topic = string;

export type ChannelFactory<T extends SupabaseClient = SupabaseClient> = (
	supabase: T,
) => RealtimeChannel;

export type RealtimeChannelFactories<
	T extends SupabaseClient = SupabaseClient,
> = Map<Topic, ChannelFactory<T>>;

export type RealtimeChannels = Map<Topic, RealtimeChannel>;

export type SubscriptionEventCallbacks = {
	onSubscribe?: (channel: RealtimeChannel) => void;
	onClose?: (channel: RealtimeChannel) => void;
	onTimeout?: (channel: RealtimeChannel) => void;
	onError?: (channel: RealtimeChannel, err: Error | undefined) => void;
};

export type SubscriptionEventCallbacksMap = Map<
	Topic,
	SubscriptionEventCallbacks
>;

/**
 * Handles realtime subscriptions to multiple channels.
 *
 * Factories are used rather than channels themselves to allow for re-creation of channels when needed
 * to do a proper reconnection after an error or timeout.
 */
export class RealtimeHandler<T extends SupabaseClient> {
	private supabaseClient: T;
	private logger: Logger;

	private channelFactories: RealtimeChannelFactories<T> = new Map();
	private channels: RealtimeChannels = new Map();

	private subscriptionEventCallbacks: SubscriptionEventCallbacksMap = new Map();

	/** Flag to indicate if the handler has been started. */
	private started = false;

	public constructor(supabaseClient: T, logger: Logger) {
		this.supabaseClient = supabaseClient;
		this.logger = logger;
	}

	/**
	 * Adds a new channel using the provided channel factory and, optionally, subscription event callbacks.
	 *
	 * @param channelFactory - A factory function responsible for creating the channel.
	 * @param subscriptionEventCallbacks - Optional callbacks for handling subscription-related events.
	 *
	 * @returns A function that, when executed, removes the channel. Use this for cleanup.
	 */
	public add(
		channelFactory: ChannelFactory<T>,
		subscriptionEventCallbacks?: SubscriptionEventCallbacks,
	) {
		const channel = this.createChannel(channelFactory);

		if (this.channelFactories.has(channel.topic)) {
			this.logger.warn(
				`Overwriting existing channel factory for topic: ${channel.topic}`,
			);
			this.unsubscribeFromChannel(channel.topic);
		}
		this.channelFactories.set(channel.topic, channelFactory);

		if (subscriptionEventCallbacks) {
			this.subscriptionEventCallbacks.set(
				channel.topic,
				subscriptionEventCallbacks,
			);
		}

		if (this.started) {
			// No reason to await, as it's all event-driven.
			this.subscribeToChannel(channel);
		}

		return () => {
			this.remove(channel.topic);
		};
	}

	/**
	 * Removes and unsubscribes the channel associated with the given topic.
	 */
	public remove(topic: Topic) {
		const resolvedTopic = topic.startsWith("realtime:")
			? topic
			: `realtime:${topic}`;
		this.channelFactories.delete(resolvedTopic);
		this.unsubscribeFromChannel(resolvedTopic);
	}

	/**
	 * Starts the realtime event handling process.
	 *
	 * @returns A cleanup function that stops realtime event handling by removing the visibility change listener
	 *          and unsubscribing from all channels.
	 */
	public start() {
		if (this.started) {
			this.logger.warn(
				"RealtimeHandler has already been started. Ignoring subsequent start call.",
			);
			return () => {};
		}

		this.subscribeToAllCreatedChannels();

		this.started = true;

		return () => {
			// cleanup
			this.unsubscribeFromAllChannels();
		};
	}

	/* -----------------------------------------------------------
       Private / Internal Methods
    ----------------------------------------------------------- */

	/**
	 * Recreates the channel for the specified topic.
	 */
	private createChannel(channelFactory: ChannelFactory<T>) {
		const channel = channelFactory(this.supabaseClient);
		this.channels.set(channel.topic, channel);
		return channel;
	}

	/**
	 * Subscribes to a single channel.
	 */
	private async subscribeToChannel(channel: RealtimeChannel) {
		if (channel.state === "joined" || channel.state === "joining") {
			this.logger.debug(
				`Channel '${channel.topic}' is already joined or joining. Skipping subscribe.`,
			);
			return;
		}

		// await this.refreshSessionIfNeeded();

		channel.subscribe(async (status, err) => {
			await this.handleSubscriptionStateEvent(channel, status, err);
		});
	}

	private subscribeToAllCreatedChannels() {
		for (const channel of this.channels.values()) {
			if (channel) {
				this.subscribeToChannel(channel);
			}
		}
	}

	private resubscribeToAllChannels() {
		for (const topic of this.channelFactories.keys()) {
			if (!this.channels.get(topic)) {
				this.resubscribeToChannel(topic);
			}
		}
	}

	/**
	 * Recreates and subscribes to the realtime channel for the given topic.
	 */
	private resubscribeToChannel(topic: Topic) {
		const channelFactory = this.channelFactories.get(topic);
		if (!channelFactory) {
			throw new Error(`Channel factory not found for topic: ${topic}`);
		}
		const channel = this.createChannel(channelFactory);
		this.subscribeToChannel(channel);
	}

	private unsubscribeFromChannel(topic: Topic) {
		const channel = this.channels.get(topic);
		if (channel) {
			this.supabaseClient.removeChannel(channel);
			this.channels.delete(topic);
		}
	}

	private unsubscribeFromAllChannels() {
		for (const topic of this.channels.keys()) {
			this.unsubscribeFromChannel(topic);
		}
	}

	private async handleSubscriptionStateEvent(
		channel: RealtimeChannel,
		status: REALTIME_SUBSCRIBE_STATES,
		error: Error | undefined,
	) {
		const { topic } = channel;

		switch (status) {
			case REALTIME_SUBSCRIBE_STATES.SUBSCRIBED: {
				this.logger.info(`Successfully subscribed to '${topic}'`);
				const subscriptionEventCallbacks =
					this.subscriptionEventCallbacks.get(topic);
				if (subscriptionEventCallbacks?.onSubscribe) {
					subscriptionEventCallbacks.onSubscribe(channel);
				}
				break;
			}
			case REALTIME_SUBSCRIBE_STATES.CLOSED: {
				this.logger.info(`Channel closed '${topic}'`);
				const subscriptionEventCallbacks =
					this.subscriptionEventCallbacks.get(topic);
				if (subscriptionEventCallbacks?.onClose) {
					subscriptionEventCallbacks.onClose(channel);
				}
				break;
			}
			case REALTIME_SUBSCRIBE_STATES.TIMED_OUT: {
				this.logger.info(`Channel timed out '${topic}'`);
				const subscriptionEventCallbacks =
					this.subscriptionEventCallbacks.get(topic);
				if (subscriptionEventCallbacks?.onTimeout) {
					subscriptionEventCallbacks.onTimeout(channel);
				}
				break;
			}
			case REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR: {
				// We'll just reconnect when the tab becomes visible again. // if the tab is hidden, we don't really care about reconnection
				if (error && isTokenExpiredError(error)) {
					this.logger.error(
						`Token expired causing channel error in '${topic}'. Refreshing session.`,
					);
					this.resubscribeToChannel(topic);
				} else {
					this.logger.error({ error }, `Channel error in '${topic}'`);
				}
				const subscriptionEventCallbacks =
					this.subscriptionEventCallbacks.get(topic);
				if (subscriptionEventCallbacks?.onError) {
					subscriptionEventCallbacks.onError(channel, error);
				}
				break;
			}
			default: {
				const exhaustiveCheck: never = status;
				throw new Error(`Unknown channel status: ${exhaustiveCheck}`);
			}
		}
	}

	/**
	 * Refreshes the session token if needed and sets the token for Supabase Realtime.
	 */
	// private async refreshSessionIfNeeded() {
	//     const { data, error } = await this.supabaseClient.auth.getSession();
	//     if (error) {
	//         throw error;
	//     }
	//     if (!data.session) {
	//         throw new Error('Session not found');
	//     }
	//     if (this.supabaseClient.realtime.accessTokenValue !== data.session.access_token) {
	//         await this.supabaseClient.realtime.setAuth(data.session.access_token);
	//     }
	// }
}

/**
 * Determines if the provided error relates to an expired token.
 */
const isTokenExpiredError = (err: Error) => {
	// For some reason, message has sometimes been undefined. Adding a ? just in case.
	// The typo in the error message is likely to be fixed soon, so be prepared for that.
	return err.message?.startsWith('"Token as expired');
};
