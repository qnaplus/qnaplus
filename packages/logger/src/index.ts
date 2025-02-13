import os from "node:os";
import { getenv } from "@qnaplus/dotenv";
import { type LoggerOptions, type TransportTargetOptions, pino } from "pino";

const targets: TransportTargetOptions[] = [
	{
		target: "pino/file",
		options: { destination: 1 },
	},
];

export const getLoggerInstance = (stream: string, options?: LoggerOptions) => {
	if (getenv("NODE_ENV") === "production") {
		targets.push({
			target: "pino-parseable",
			options: {
				endpoint: getenv("PARSEABLE_ENDPOINT"),
				stream,
				auth: {
					username: getenv("PARSEABLE_USERNAME"),
					password: getenv("PARSEABLE_PASSWORD"),
				},
			},
		});
	} else if (getenv("NODE_ENV") !== "development") {
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
