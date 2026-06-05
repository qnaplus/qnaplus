import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getenv } from "@qnaplus/dotenv";
import { lazy, trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

const BUCKET = "qnaplus";

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

export const uploadObject = async (key: string, buffer: Buffer, logger: Logger) => {
	const command = new PutObjectCommand({
		Key: key,
		Bucket: BUCKET,
		Body: buffer,
		Metadata: {
			version: randomUUID(),
		},
	});
	const [error] = await trycatch(() => r2().send(command));
	if (error) {
		logger.error({ error }, "An error occurred while uploading data to bucket.");
		return;
	}
};

export const getObject = async (key: string, logger: Logger): Promise<string | null> => {
	const command = new GetObjectCommand({
		Key: key,
		Bucket: BUCKET
	});
	const [responseError, response] = await trycatch(() => r2().send(command));
	if (responseError) {
		logger.error({ error: responseError }, "An error occurred while getting object from bucket.");
		return null;
	}
	if (response.Body === undefined) {
		logger.error("Body is not present on response.");
		return null
	}
	const [dataError, data] = await trycatch(() => response.Body!.transformToString());
	if (dataError) {
		logger.error({ error: dataError }, "An error occurred while reading the response body.");
		return null;
	}
	return data;
}
