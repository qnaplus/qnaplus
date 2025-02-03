import { config } from '@qnaplus/config';
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
    out: './drizzle',
    schema: './src/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: config.getenv("SUPABASE_CONNECTION_STRING"),
    },
});