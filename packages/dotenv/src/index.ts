import { InfisicalSDK } from "@infisical/sdk";

const INFISICAL_PROJECT_ID = "1e4a9be2-aaf8-4e0b-be53-185dac145515";

const ENV_VARIABLES = [
	"SUPABASE_TRANSACTION_URL",
	"SUPABASE_SESSION_URL",
	"DISCORD_TOKEN",
	"NODE_ENV",
	"BROADCASTER_CHANNELS",
	"DATABASE_UPDATE_INTERVAL",
	"LOKI_HOST",
	"LOKI_USERNAME",
	"LOKI_PASSWORD",
	"CF_ACCOUNT_ID",
	"CF_ACCESS_KEY_ID",
	"CF_SECRET_ACCESS_KEY",
	"QNA_WEBSITE",
] as const;

export type EnvVariable = (typeof ENV_VARIABLES)[number];

const loadEnv = () => {
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

export const initializeEnv = async () => {
	const clientId = process.env.INFISICAL_MACHINE_CLIENT_ID;
	const clientSecret = process.env.INFISICAL_MACHINE_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error(
			"Missing Infisical credentials: INFISICAL_MACHINE_CLIENT_ID and INFISICAL_MACHINE_CLIENT_SECRET are required",
		);
	}

	const environment =
		process.env.INFISICAL_SECRET_ENV ??
		(process.env.NODE_ENV === "production" ? "prod" : "dev");

	const client = new InfisicalSDK();
	await client.auth().universalAuth.login({ clientId, clientSecret });

	const { secrets } = await client.secrets().listSecrets({
		projectId: INFISICAL_PROJECT_ID,
		environment,
	});

	ENV = Object.fromEntries(secrets.map((s) => [s.secretKey, s.secretValue]));
};

export const getenv = (key: EnvVariable) => {
	if (ENV === null) {
		ENV = loadEnv();
	}
	return ENV[key];
};
