/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
	readonly VITE_APP_NAME: string;
	readonly VITE_DATA_URL: string;
	readonly VITE_UPDATE_INTERVAL_HOURS: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
