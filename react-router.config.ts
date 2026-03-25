// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  // App directory (mặc định là "app")
  appDirectory: "app",
  // Build cho SSR (Server Side Rendering) trên Vercel
  ssr: true, 
} satisfies Config;