import * as path from "node:path";
import { config } from "dotenv";

const ENV_VARIABLES = [
	"SUPABASE_URL",
	"SUPABASE_KEY", // TODO figure out RLS or how to get the correct permissions to access the database
	"SUPABASE_TRANSACTION_URL",
	"SUPABASE_SESSION_URL",
	"DISCORD_TOKEN",
	"NODE_ENV",
	"BROADCASTER_CHANNELS",
	"DATABASE_UPDATE_INTERVAL",
	"LOKI_HOST",
	"LOKI_USERNAME",
	"LOKI_PASSWORD",
	"CF_QUESTIONS_KEY",
	"CF_ACCOUNT_ID",
	"CF_ACCESS_KEY_ID",
	"CF_SECRET_ACCESS_KEY",
	"QNA_WEBSITE",
] as const;

type EnvVariable = (typeof ENV_VARIABLES)[number];

const loadEnv = () => {
	const { error } = config({ path: path.resolve(__dirname, "../../../.env") });
	if (error) {
		console.error(error);
		throw Error("Environment variables could not be loaded, exiting");
	}
	const loaded: Record<string, string> = {};
	for (const v of ENV_VARIABLES) {
		const value = process.env[v];
		if (value === undefined) {
			throw Error(`Environment variable '${v}' missing, exiting.`);
		}
		loaded[v] = value;
	}
	return loaded;
};

let ENV: Record<string, string> | null = null;

export const getenv = (key: EnvVariable) => {
	if (ENV === null) {
		ENV = loadEnv();
	}
	return ENV[key];
};
