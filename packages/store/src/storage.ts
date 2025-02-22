import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getenv } from "@qnaplus/dotenv";
import { lazy, trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";
import { QNAPLUS_BUCKET } from "./resources";

const r2 = lazy(
	() =>
		new S3Client({
			region: "auto",
			endpoint: `https://${getenv("CF_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: getenv("CF_ACCESS_KEY_ID"),
				secretAccessKey: getenv("CF_SECRET_ACCESS_KEY"),
			},
			requestChecksumCalculation: "WHEN_REQUIRED",
			responseChecksumValidation: "WHEN_REQUIRED",
		}),
);

export const upload = async (key: string, buffer: Buffer, logger: Logger) => {
	const command = new PutObjectCommand({
		Key: key,
		Bucket: QNAPLUS_BUCKET,
		Body: buffer,
	});
	const { ok, error } = await trycatch(r2().send(command));
	if (!ok) {
		logger.error(
			{ error },
			"An error occurred while uploading questions to bucket.",
		);
		return;
	}
};
