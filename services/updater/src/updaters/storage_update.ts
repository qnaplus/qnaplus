import { Logger } from "pino";
import { getAllQuestions, QnaplusBuckets, upload, UploadMetadata } from "qnaplus";

export const doStorageUpdate = async (_logger?: Logger) => {
    const logger = _logger?.child({ label: "doStorageUpdate" });
    const { ok, error, result: questions } = await getAllQuestions();
    if (!ok) {
        logger?.error({ error }, "An error occurred while retreiving all questions from database.");
        return;
    }
    const json = JSON.stringify(questions);
    // typed as any to address limitation in tus-js-client (https://github.com/tus/tus-js-client/issues/289)
    const buffer: any = Buffer.from(json, "utf-8");
    const metadata: UploadMetadata = {
        bucket: QnaplusBuckets.Data,
        filename: "questions.json",
        type: "application/json"
    }
    try {
        await upload(buffer, metadata, logger);
    } catch (e) {
        logger?.error({ error: e }, "Error while updating storage json")
    }
}
