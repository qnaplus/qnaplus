import type { Question } from "@qnaplus/scraper";
import {
	type MaybeRefOrGetter,
	type Ref,
	reactive,
	ref,
	toValue,
	watchEffect,
} from "vue";
import type { Option } from "./types";

export type SearchFilters = {
	season: Option<Question["season"]>[];
	program: Option<Question["program"]>[];
	author: Question["author"] | null;
	state: Option<QuestionStateValue>;
	askedBefore: Date | null;
	askedAfter: Date | null;
	answeredBefore: Date | null;
	answeredAfter: Date | null;
	tags: string[];
};

export enum QuestionStateValue {
	All = 0,
	Answered = 1,
	Unanswered = 2,
}

export const questionStateOptions: Option<QuestionStateValue>[] = [
	{ name: "All", value: QuestionStateValue.All },
	{ name: "Answered", value: QuestionStateValue.Answered },
	{ name: "Unanswered", value: QuestionStateValue.Unanswered },
];

type FilterMap = {
	[K in keyof SearchFilters]: (
		question: Question,
		filters: SearchFilters,
	) => boolean;
};

const FILTER_MAP: FilterMap = {
	season(q, f) {
		return f.season.find((s) => s.value === q.season) !== undefined;
	},
	program(q, f) {
		return f.program.find((p) => p.value === q.program) !== undefined;
	},
	author(q, f) {
		return q.author.startsWith(f.author ?? "");
	},
	state(q, f) {
		if (f.state.value === QuestionStateValue.All) {
			return true;
		}
		return f.state.value === QuestionStateValue.Answered
			? q.answered
			: !q.answered;
	},
	askedBefore(q, f) {
		if (q.askedTimestampMs === null || f.askedBefore === null) {
			return false;
		}
		return new Date(q.askedTimestampMs) < f.askedBefore;
	},
	askedAfter(q, f) {
		if (q.askedTimestampMs === null || f.askedAfter === null) {
			return false;
		}
		return new Date(q.askedTimestampMs) > f.askedAfter;
	},
	answeredBefore(q, f) {
		if (q.askedTimestampMs === null || f.answeredBefore === null) {
			return false;
		}
		return new Date(q.askedTimestampMs) < f.answeredBefore;
	},
	answeredAfter(q, f) {
		if (q.askedTimestampMs === null || f.answeredAfter === null) {
			return false;
		}
		return new Date(q.askedTimestampMs) > f.answeredAfter;
	},
	tags(q, f) {
		return f.tags.every((t) => q.tags.includes(t));
	},
};

const isEmptyFilterValue = (
	filterValue: SearchFilters[keyof SearchFilters],
): boolean => {
	if (typeof filterValue === "string") {
		return filterValue.trim() === "";
	}
	if (Array.isArray(filterValue)) {
		return filterValue.length === 0;
	}
	return filterValue === null;
};

export type SearchFilterComposable = {
	filters: SearchFilters;
	filteredQuestions: Ref<Question[]>;
	appliedFilterCount: Ref<number>;
	clearFilters(): void;
	seasons: Option<string>[];
	programs: Option<string>[];
};

export type SearchFilterOptions = Omit<
	SearchFilterComposable,
	"filteredQuestions"
>;

export type FilterData = {
	programs: string[];
	seasons: string[];
};

export const useSearchFilter = (
	questions: MaybeRefOrGetter<Question[]>,
	filterData: FilterData,
): SearchFilterComposable => {
	const seasons = filterData.seasons.map((season) => ({
		name: season,
		value: season,
	}));
	const programs = filterData.programs.map((program) => ({
		name: program,
		value: program,
	}));

	const getInitialFilterState = () => {
		return {
			season: [seasons[0]],
			program: [],
			author: null,
			state: {
				name: "All",
				value: QuestionStateValue.All,
			},
			askedBefore: null,
			askedAfter: null,
			answeredBefore: null,
			answeredAfter: null,
			tags: [],
		};
	};

	const clearFilters = () => {
		Object.assign(filters, getInitialFilterState());
	};

	const filters = reactive<SearchFilters>(getInitialFilterState());
	const filteredQuestions = ref<Question[]>([]);
	const appliedFilterCount = ref<number>(0);

	const applyFilters = () => {
		const value = toValue(questions);
		const keys = Object.keys(filters) as Array<keyof SearchFilters>;
		const applicableFilters = keys
			.filter((k) => !isEmptyFilterValue(filters[k]))
			.map((k) => FILTER_MAP[k]);
		appliedFilterCount.value =
			applicableFilters.length -
			+(filters.state.value === QuestionStateValue.All);
		filteredQuestions.value = value.filter((q) =>
			applicableFilters.every((f) => f(q, filters)),
		);
	};

	watchEffect(() => applyFilters());

	return {
		filters,
		filteredQuestions,
		clearFilters,
		seasons,
		programs,
		appliedFilterCount,
	};
};
