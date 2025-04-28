import { getenv } from "@qnaplus/dotenv";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: getenv("SUPABASE_SESSION_URL"),
	},
});
