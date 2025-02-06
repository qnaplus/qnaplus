// vite.config.ts
import vue from "file:///home/battlesqui_d/qnaplus/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { defineConfig } from "file:///home/battlesqui_d/qnaplus/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///home/battlesqui_d/qnaplus/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
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
            type: "image/png"
          },
          {
            src: "icons/qnaplus-180x180.png",
            sizes: "180x180",
            type: "image/png"
          },
          {
            src: "icons/qnaplus-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/qnaplus-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "icons/qnaplus.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,eot,ttf}"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        ignoreURLParametersMatching: [
          /^v/
        ]
      },
      devOptions: {
        enabled: false,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module"
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9iYXR0bGVzcXVpX2QvcW5hcGx1cy9zZXJ2aWNlcy93ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL2JhdHRsZXNxdWlfZC9xbmFwbHVzL3NlcnZpY2VzL3dlYi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9iYXR0bGVzcXVpX2QvcW5hcGx1cy9zZXJ2aWNlcy93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBiYXNlOiBcIi4vXCIsXG4gICAgcGx1Z2luczogW1xuICAgICAgICB2dWUoKSxcbiAgICAgICAgVml0ZVBXQSh7XG4gICAgICAgICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgICAgICAgIGluamVjdFJlZ2lzdGVyOiBcImlubGluZVwiLFxuICAgICAgICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgICAgICAgICBpZDogXCJiYXR0bGVzcXVpZC5xbmFwbHVzXCIsXG4gICAgICAgICAgICAgICAgbmFtZTogJ3FuYXBsdXMnLFxuICAgICAgICAgICAgICAgIHNob3J0X25hbWU6ICdxbmFwbHVzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkIHNlYXJjaCB0b29sIGZvciB0aGUgVkVYIFJvYm90aWNzIFEmQScsXG4gICAgICAgICAgICAgICAgdGhlbWVfY29sb3I6ICcjMTgxODFiJyxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiBcIiMxMjEyMTJcIixcbiAgICAgICAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6IFwiaWNvbnMvcW5hcGx1cy02NHg2NC5wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiBcIjY0eDY0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6IFwiaWNvbnMvcW5hcGx1cy0xODB4MTgwLnBuZ1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZXM6IFwiMTgweDE4MFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiBcImljb25zL3FuYXBsdXMtMTkyeDE5Mi5wbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2UvcG5nXCIsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogXCJpY29ucy9xbmFwbHVzLTUxMng1MTIucG5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6IFwiaWNvbnMvcW5hcGx1cy5zdmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemVzOiBcIjUxMng1MTJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2Uvc3ZnK3htbFwiLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLHN2ZyxwbmcsaWNvLHdvZmYsd29mZjIsZW90LHR0Zn0nXSxcbiAgICAgICAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgICAgICAgICAgIGlnbm9yZVVSTFBhcmFtZXRlcnNNYXRjaGluZzogW1xuICAgICAgICAgICAgICAgICAgICAvXnYvXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGV2T3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICBzdXBwcmVzc1dhcm5pbmdzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSlcbiAgICBdLFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVMsT0FBTyxTQUFTO0FBQ3ZULFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsZUFBZTtBQUd4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixNQUFNO0FBQUEsRUFDTixTQUFTO0FBQUEsSUFDTCxJQUFJO0FBQUEsSUFDSixRQUFRO0FBQUEsTUFDSixjQUFjO0FBQUEsTUFDZCxnQkFBZ0I7QUFBQSxNQUNoQixVQUFVO0FBQUEsUUFDTixJQUFJO0FBQUEsUUFDSixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixPQUFPO0FBQUEsVUFDSDtBQUFBLFlBQ0ksS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsWUFDSSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDVjtBQUFBLFVBQ0E7QUFBQSxZQUNJLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNWO0FBQUEsVUFDQTtBQUFBLFlBQ0ksS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1Y7QUFBQSxVQUNBO0FBQUEsWUFDSSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDVjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsTUFFQSxTQUFTO0FBQUEsUUFDTCxjQUFjLENBQUMsbURBQW1EO0FBQUEsUUFDbEUsdUJBQXVCO0FBQUEsUUFDdkIsY0FBYztBQUFBLFFBQ2QsNkJBQTZCO0FBQUEsVUFDekI7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLE1BRUEsWUFBWTtBQUFBLFFBQ1IsU0FBUztBQUFBLFFBQ1Qsa0JBQWtCO0FBQUEsUUFDbEIsa0JBQWtCO0FBQUEsUUFDbEIsTUFBTTtBQUFBLE1BQ1Y7QUFBQSxJQUNKLENBQUM7QUFBQSxFQUNMO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
