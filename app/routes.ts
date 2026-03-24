// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Cấu trúc lồng nhau: MainLayout bọc lấy các route bên trong mảng con
  route("/", "components/layout/MainLayout.tsx", [
    index("routes/home.tsx"),          // URL: /
    route("pantry", "routes/pantry.tsx"), // URL: /pantry
    route("recipe/:id", "routes/recipe-detail.tsx"), // URL: /recipe/7
    route("profile", "routes/profile.tsx"),
    route("tag/:tagName", "routes/tag-results.tsx"),
    route("search", "routes/search-results.tsx"),
  ]),

  route("auth", "routes/auth.tsx"),
] satisfies RouteConfig;