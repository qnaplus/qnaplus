import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
	base: "./",
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "inline",
			manifest: {
				id: "battlesquid.qnaplus",
				name: "qnaplus",
				short_name: "qnaplus",
				description: "Advanced search tool for the VEX Robotics Q&A",
				theme_color: "#18181b",
				background_color: "#121212",
				icons: [
					{
						src: "icons/qnaplus-64x64.png",
						sizes: "64x64",
						type: "image/png",
					},
					{
						src: "icons/qnaplus-180x180.png",
						sizes: "180x180",
						type: "image/png",
					},
					{
						src: "icons/qnaplus-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "icons/qnaplus-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "icons/qnaplus.svg",
						sizes: "512x512",
						type: "image/svg+xml",
					},
				],
			},

			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,eot,ttf}"],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				ignoreURLParametersMatching: [/^v/],
			},

			devOptions: {
				enabled: false,
				navigateFallback: "index.html",
				suppressWarnings: true,
				type: "module",
			},
		}),
	],
});
