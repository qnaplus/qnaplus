import os from "node:os";
import { getenv } from "@qnaplus/dotenv";
import { type LoggerOptions, type TransportTargetOptions, pino } from "pino";

const targets: TransportTargetOptions[] = [
	{
		target: "pino/file",
		options: { destination: 1 },
	},
];

export const getLoggerInstance = (service: string, options?: LoggerOptions) => {
	if (
		getenv("NODE_ENV") === "production" ||
		getenv("NODE_ENV") === "development"
	) {
		targets.push({
			target: "pino-loki",
			options: {
				batching: true,
				interval: 5,
				labels: {
					service,
				},
				host: getenv("LOKI_HOST"),
				basicAuth: {
					username: getenv("LOKI_USERNAME"),
					password: getenv("LOKI_PASSWORD"),
				},
			},
		});
	} else {
		targets.push({
			target: "pino-pretty",
		});
	}
	return pino({
		...options,
		base: {
			env: getenv("NODE_ENV"),
			pid: process.pid,
			hostname: os.hostname(),
		},
		errorKey: "error",
		transport: {
			targets,
		},
	});
};
