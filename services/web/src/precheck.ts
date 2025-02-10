import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { v4 } from "uuid"

let SUPABASE_CLIENT: SupabaseClient | null = null;
const getClient = () => {
    if (SUPABASE_CLIENT === null) {
        SUPABASE_CLIENT = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
        )
    }
    return SUPABASE_CLIENT;
}

export const doPrecheck = async (id: string): Promise<boolean | null> => {
    const supabase = getClient();
    const room = v4();

    const precheckStatus = await supabase
        .channel("precheck", {
            config: {
                broadcast: { ack: true }
            }
        })
        .send({
            type: "broadcast",
            event: "precheck-request",
            payload: { room, id }
        })

    if (precheckStatus !== "ok") {
        console.warn(`Got ${precheckStatus} for precheck status`)
        // TODO: add logging
        return null;
    }

    const exists = await new Promise<boolean | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(null);
        }, 1000 * 10);
        supabase
            .channel(room)
            .on(
                "broadcast",
                { event: "precheck-response" },
                ({ payload }) => {
                    clearTimeout(timeout);
                    resolve(!payload.exists);
                }
            )
            .subscribe()
    });

    const unsubscribeStatus = await supabase.removeAllChannels();
    if (!unsubscribeStatus.every(s => s === "ok")) {
        // TODO: logging
        console.warn("Unable to remove all channels");
    }

    return exists;
}