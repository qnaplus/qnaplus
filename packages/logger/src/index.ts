import { config } from "@qnaplus/dotenv"
import pino, { LoggerOptions } from "pino"
import os from "os";

export const getLoggerInstance = (stream: string, options?: LoggerOptions) => {
    return pino({
        ...options,
        base: {
            env: config.getenv("NODE_ENV"),
            pid: process.pid,
            hostname: os.hostname()
        },
        errorKey: "error",
        transport: {
            targets: [
                {
                    target: "pino-parseable",
                    options: {
                        endpoint: config.getenv("PARSEABLE_ENDPOINT"),
                        stream,
                        auth: {
                            username: config.getenv("PARSEABLE_USERNAME"),
                            password: config.getenv("PARSEABLE_PASSWORD")
                        }
                    }
                },
                {
                    target: 'pino/file',
                    options: { destination: 1 }
                }
            ] 
        }
    })
}
