const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export const isValidDate = (
	date: Date,
	year: number,
	month: number,
	day: number,
) => {
	return (
		date.getFullYear() === year &&
		date.getMonth() + 1 === month &&
		date.getDate() === day
	);
};

export const mmmToMonthNumber = (mmm: string) => {
	return months.indexOf(mmm) + 1;
};

export const monthNumberToMMM = (month: number) => {
	return months[month];
};

export const formatDDMMMYYYY = (date: Date) => {
	if (date.toString() === "Invalid Date") {
		return "Invalid Date";
	}
	const year = date.getFullYear();
	const month = monthNumberToMMM(date.getMonth());
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${day}-${month}-${year}`;
};
