import { Suspense } from "react";
import MainLayout from "~/components/layout/MainLayout";

export default function MainRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Đang tải...</div>}>
        {children}
      </Suspense>
    </MainLayout>
  );
}
