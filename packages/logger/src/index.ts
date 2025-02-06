import { getenv } from "@qnaplus/dotenv"
import { pino, LoggerOptions } from "pino"
import os from "os";

export const getLoggerInstance = (stream: string, options?: LoggerOptions) => {
    return pino({
        ...options,
        base: {
            env: getenv("NODE_ENV"),
            pid: process.pid,
            hostname: os.hostname()
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
                            password: getenv("PARSEABLE_PASSWORD")
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
