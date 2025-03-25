import {
	type FetchClient,
	type FetchClientResponse,
	type Season,
	checkIfReadOnly,
	pingQna,
} from "@qnaplus/scraper";
import {
	getAllPrograms,
	getMetadata,
	getQnaStates,
	updateQnaStates,
} from "@qnaplus/store";
import type { Logger } from "pino";

type ProgramState = {
	program: string;
	open: boolean;
};

const getNextSeason = (season: Season) => {
	if (!/^\d{4}-\d{4}$/.test(season)) {
		throw new Error(`Invalid season '${season}' provided.`);
	}
	const endYear = Number.parseInt(season.split("-")[1]);
	return `${endYear}-${endYear + 1}`;
};

export const doQnaCheck = async (
	client: FetchClient<FetchClientResponse>,
	logger: Logger,
) => {
	logger.info("Starting programs update.");
	const [programsError, programs] = await getAllPrograms();
	if (programsError) {
		logger.error(
			{ error: programsError },
			"An error occurred while trying to aggregate all programs, exiting.",
		);
		return;
	}
	const [metadataError, metadata] = await getMetadata();
	if (metadataError || metadata === undefined) {
		logger.error(
			{ error: metadataError },
			"An error occurred while retrieving metadata, exiting.",
		);
		return;
	}
	const [statesError, states] = await getQnaStates();
	if (statesError) {
		logger.error(
			{ error: statesError },
			"An error occurred while trying to fetch existing Q&A states, exiting.",
		);
		return;
	}
	const statesMap = states.reduce<Record<string, boolean>>((map, s) => {
		map[s.program] = s.open;
		return map;
	}, {});

	const season = metadata.currentSeason;
	const newStates: ProgramState[] = [];
	for (const { program } of programs) {
		// get the 'open' state for a given program
		// if there is none, default to true so we can initialize one
		const statesMapOpen = statesMap[program] ?? true;
		let open: boolean;
		if (statesMapOpen) {
			const readonly = await checkIfReadOnly(program, season, {
				client,
				logger,
			});
			if (readonly === null) {
				logger.warn(
					`Unable to check state for ${program} (${season}), skipping.`,
				);
				continue;
			}
			open = !readonly;
		} else {
			open = await pingQna(program, getNextSeason(season), { client, logger });
		}

		newStates.push({ program, open });
	}
	const [updatedError] = await updateQnaStates(newStates);
	if (updatedError) {
		logger.error(
			{ error: updatedError },
			"An error occurred while updating program states, exiting.",
		);
		return;
	}
	logger.info("Successfully completed programs update.");
};
