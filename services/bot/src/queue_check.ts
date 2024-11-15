import { Question } from "@qnaplus/scraper";
import { ChangeQuestion, getSupabaseInstance, QnaplusTables } from "qnaplus";
import { handleOnChange } from "./broadcaster";
import { PinoLoggerAdapter } from "./logger_adapter";

export const doQueueCheck = async (_logger: PinoLoggerAdapter) => {
    const logger = _logger.child({ label: "doQueueCheck" });
    logger.info("Running queue check.")
    const supabase = getSupabaseInstance();
    const queue = await supabase
        .from(QnaplusTables.AnswerQueue)
        .select(`*, ..."${QnaplusTables.Questions}" (*)`)
        .returns<Question[]>(); // TODO remove once spread is fixed (https://github.com/supabase/postgrest-js/pull/531)
    if (queue.error) {
        logger.error({ error: queue.error }, "An error occurred while trying to retreive answer queue.")
        return;
    }
    if (queue.data.length === 0) {
        logger.info("No questions found in answer queue, exiting.");
        return;
    }
    const changeQuestions: ChangeQuestion[] = queue.data.map(q => ({ ...q, changeType: "answered" }));
    await handleOnChange(changeQuestions);
    const deleted = await supabase
        .from(QnaplusTables.AnswerQueue)
        .delete()
        .neq("id", "0");
    if (deleted.error) {
        logger.error({ error: deleted.error }, "An error occurred while trying to flush answer queue.")
    }
}
