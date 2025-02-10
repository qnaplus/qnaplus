import { type SupabaseClient, createClient } from "@supabase/supabase-js";

let SUPABASE_CLIENT: SupabaseClient | null = null;
const getClient = () => {
    if (SUPABASE_CLIENT === null) {
        SUPABASE_CLIENT = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    }
    return SUPABASE_CLIENT;
}

export const doPrecheck = async (id: string) => {
    
}