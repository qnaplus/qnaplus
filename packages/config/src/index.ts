import { config as configenv } from "dotenv";
import * as path from "path";

const ENV_VARIABLES = [
    "SUPABASE_URL",
    "SUPABASE_KEY", // TODO figure out RLS or how to get the correct permissions to access the database
    "SUPABASE_CONNECTION_STRING",
    "DISCORD_TOKEN",
    "NODE_ENV",
    "BROADCASTER_CHANNELS",
    "DATABASE_UPDATE_INTERVAL",
    "WEBAPP_UPDATE_INTERVAL",
    "PARSEABLE_ENDPOINT",
    "PARSEABLE_USERNAME",
    "PARSEABLE_PASSWORD",
    "QNA_WEBSITE"
] as const;

type ConfigVariable = typeof ENV_VARIABLES[number];

const loadConfig = () => {
    const { error } = configenv({ path: path.resolve(__dirname, "../../../.env") });
    if (error) {
        console.error(error);
        throw Error(`Environment variables could not be loaded, exiting`);
    }
    const loaded: Record<string, string> = {};
    ENV_VARIABLES.forEach((v) => {
        const value = process.env[v];
        if (value === undefined) {
            throw Error(`Environment variable '${v}' missing, exiting.`);
        }
        loaded[v] = value;
    });
    return loaded;
}

let CONFIG: Record<string, string> | null = null;

export const config = {
    getenv(key: ConfigVariable) {
        if (CONFIG === null) {
            CONFIG = loadConfig();
        }
        return CONFIG[key];
    }
}