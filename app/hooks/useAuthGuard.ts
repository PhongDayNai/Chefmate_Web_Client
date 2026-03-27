import { useNavigate, useLocation } from "react-router";
import toast from "react-hot-toast";
import { checkAuth, saveRedirectUrl } from "~/utils/authUtils";

/**
 * Custom hook for authentication guard on mutation operations
 * Checks if user is authenticated before allowing actions
 * If not authenticated, shows toast and redirects to login with saved URL
 */
export function useAuthGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Check if user is currently authenticated
   */
  const isAuthenticated = (): boolean => {
    return checkAuth();
  };

  /**
   * Guard function to require authentication
   * Shows toast error and redirects to login if not authenticated
   * Returns true if authenticated, false otherwise
   */
  const requireAuth = (): boolean => {
    if (!isAuthenticated()) {
      // Show error toast
      toast.error("Yêu cầu đăng nhập để thực hiện chức năng này");

      // Save current URL for redirect after login
      const currentUrl = location.pathname + location.search + location.hash;
      saveRedirectUrl(currentUrl);

      // Redirect to login page
      navigate("/auth");

      return false;
    }

    return true;
  };

  return {
    isAuthenticated,
    requireAuth,
  };
}
