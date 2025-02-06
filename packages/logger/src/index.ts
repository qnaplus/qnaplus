import os from "node:os";
import { getenv } from "@qnaplus/dotenv";
import { type LoggerOptions, pino } from "pino";

export const getLoggerInstance = (stream: string, options?: LoggerOptions) => {
	return pino({
		...options,
		base: {
			env: getenv("NODE_ENV"),
			pid: process.pid,
			hostname: os.hostname(),
		},
		errorKey: "error",
		transport: {
			targets: [
				{
					target: "pino-parseable",
					options: {
						endpoint: getenv("PARSEABLE_ENDPOINT"),
						stream,
						auth: {
							username: getenv("PARSEABLE_USERNAME"),
							password: getenv("PARSEABLE_PASSWORD"),
						},
					},
				},
				{
					target: "pino/file",
					options: { destination: 1 },
				},
			],
		},
	});
};
