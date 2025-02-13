export type WordLimitResult = {
	applied: boolean;
	content: string;
};

export const applyWordLimit = (
	content: string | undefined | null,
	limit: number,
	elipsisText?: string,
): WordLimitResult => {
	const words = content?.split(" ") ?? [];
	if (words.length <= limit) {
		return {
			applied: false,
			content: words.join(" "),
		};
	}
	const limitedContent = words.slice(0, limit).join(" ");
	return {
		applied: true,
		content: !isEmpty(limitedContent)
			? `${limitedContent} ${elipsisText ?? "..."}`
			: "",
	};
};

export const isEmpty = (content: string | undefined | null) => {
	return content === undefined || content === null || content.trim() === "";
};
