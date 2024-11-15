interface IQnaplusTables {
    Questions: "questions";
    Metadata: "metadata";
    RenotifyQueue: "renotify_queue";
    Failures: "failures";
    AnswerQueue: "answer_queue";
}

export const QnaplusTables: IQnaplusTables = {
    Questions: "questions",
    Metadata: "metadata",
    RenotifyQueue: "renotify_queue",
    Failures: "failures",
    AnswerQueue: "answer_queue"
}

export const QnaplusBuckets = {
    Data: "data"
}

export const QnaplusEvents = {
    RenotifyQueueFlush: "renotify_queue_flush",
    RenotifyQueueFlushAck: "renotify_queue_flush_ack"
}

export const QnaplusChannels = {
    DbChanges: "db-changes",
    RenotifyQueue: "renotify-queue"
}