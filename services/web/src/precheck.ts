import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { v4 } from "uuid";
import { supabase } from "./supabase";

export const doPrecheck = async (id: string): Promise<boolean | null> => {
	const room = v4();

	console.log("sending precheck request");
	const exists = await new Promise<boolean | null>((resolve) => {
		let timeout = setTimeout(() => {
			resolve(null);
		}, 1000 * 5);

		supabase()
			.channel(room)
			.on("broadcast", { event: "precheck-response" }, ({ payload }) =>
				resolve(!payload.exists),
			)
			.subscribe((status) => {
				clearTimeout(timeout);
				if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
					resolve(null);
					return;
				}
				timeout = setTimeout(() => {
					resolve(null);
				}, 1000 * 5);
				supabase()
					.channel("precheck")
					.send({
						type: "broadcast",
						event: "precheck-request",
						payload: { room, id },
					})
					.catch(console.error);
			});
	});

	const unsubscribeStatus = await supabase().removeAllChannels();
	if (!unsubscribeStatus.every((s) => s === "ok")) {
		// TODO: logging
		console.warn("Unable to remove all channels");
	}

	return exists;
};
