import { type Season, checkIfReadOnly, pingQna } from "@qnaplus/scraper";
import { getAllPrograms, getMetadata, getQnaStates, updateQnaStates } from "@qnaplus/store";
import type { Logger } from "pino";

type ProgramState = {
    program: string;
    open: boolean;
}

const getNextSeason = (season: Season) => {
    if (!/^\d{4}-\d{4}$/.test(season)) {
        throw new Error(`Invalid season '${season}' provided.`);
    }
    const endYear = Number.parseInt(season.split("-")[1]);
    return `${endYear}-${endYear + 1}`
}

export const doQnaCheck = async (logger: Logger) => {
    logger.info("Starting programs update.");
    const programs = await getAllPrograms();
    if (!programs.ok) {
        logger.error({ error: programs.error }, "An error occurred while trying to aggregate all programs, exiting.");
        return;
    }
    const metadata = await getMetadata();
    if (!metadata.ok || metadata.result === undefined) {
        logger.error({ error: metadata.error }, "An error occurred while retrieving metadata, exiting.");
        return;
    }
    const oldStates = await getQnaStates();
    if (!oldStates.ok) {
        logger.error({ error: oldStates.error }, "An error occurred while trying to fetch existing Q&A states, exiting.");
        return;
    }
    const statesMap = oldStates.result.reduce<Record<string, boolean>>((map, s) => {
        map[s.program] = s.open;
        return map;
    }, {});

    const season = metadata.result?.currentSeason as Season;
    const newStates: ProgramState[] = [];
    for (const { program } of programs.result) {
        if (statesMap[program] === undefined) {
            continue;
        }
        const open = statesMap[program]
            ? await checkIfReadOnly(program, season, { logger })
            : await pingQna(program, getNextSeason(season), { logger });
        if (open === null) {
            logger.warn(`Unable to check state for ${program} (${season}), skipping.`);
            continue;
        }
        newStates.push({ program, open });
    }
    const updated = await updateQnaStates(newStates);
    if (!updated.ok) {
        logger.error({ error: updated.error }, "An error occurred while updating program states, exiting.");
        return;
    }
    logger.info("Successfully completed programs update.");
}
