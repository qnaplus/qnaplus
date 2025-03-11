export const QNAPLUS_BUCKET = "qnaplus";

export const QnaplusEvents = {
	RenotifyQueueFlush: "renotify_queue_flush",
	RenotifyQueueFlushAck: "renotify_queue_flush_ack",
	PrecheckRequest: "precheck-request",
	PrecheckResponse: "precheck-response",
};

export const QnaplusChannels = {
	DbUpdates: "db-updates",
	DbChanges: "db-changes",
	RenotifyQueue: "renotify-queue",
	Precheck: "precheck",
	ProgramStates: "program-states",
};
