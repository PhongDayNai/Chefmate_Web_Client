// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  // Bật SSR để Vercel nhận diện đúng môi trường Server-side
  ssr: true,
  
  // Đây là phần quan trọng để Vercel không báo lỗi preset
  // Chúng ta định nghĩa các build target cụ thể
  buildDirectory: "build",
  appDirectory: "app",
} satisfies Config;