"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { checkAuth, saveRedirectUrl } from "~/utils/authUtils";

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAuthenticated = (): boolean => checkAuth();

  const requireAuth = (): boolean => {
    if (!isAuthenticated()) {
      toast.error("Yêu cầu đăng nhập để thực hiện chức năng này");

      const search = searchParams.toString();
      const currentUrl = `${pathname}${search ? `?${search}` : ""}`;
      saveRedirectUrl(currentUrl);

      router.push("/auth");
      return false;
    }

    return true;
  };

  return {
    isAuthenticated,
    requireAuth,
  };
}
