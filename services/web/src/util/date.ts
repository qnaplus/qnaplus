export const elapsedHours = (start: Date, end: Date) => {
	return (end.getTime() - start.getTime()) / 1000 / 60 / 60;
};
