import { getContext } from "hono/context-storage";

const vars = {
    SERVER_URL: {
        development: "https://dev.api.qnapl.us",
        production: "https://api.qnapl.us"
    },
    SERVER_DESCRIPTION: {
        development: "Development Server",
        production: "Production Server"
    },
    SPECS_DESCRIPTION: {
        development: "API for interacting with Q&A related resources. This is the development API, things are subject to change without notice! For stable API usage, see https://api.qnapl.us/docs.",
        production: "API for interacting with Q&A related resources."
    },
    SPECS_TITLE: {
        development: "qnaplus (dev)",
        production: "qnaplus"
    }
}

type VarKey = keyof typeof vars;

export default (key: VarKey) => {
    const ctx = getContext<{ Bindings: Env }>();
    return vars[key][ctx.env.ENVIRONMENT];
}