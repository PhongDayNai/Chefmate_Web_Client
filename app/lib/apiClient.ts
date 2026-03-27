// app/lib/apiClient.ts
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "~/lib/apiConfig";

// Khởi tạo instance axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- INTERCEPTOR CHO REQUEST (TRƯỚC KHI GỬI ĐI) ---
apiClient.interceptors.request.use(
  (config) => {
    // Lấy userId từ máy người dùng
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    
    // Kiểm tra xem hành động có phải là ghi dữ liệu (POST, PUT, DELETE, PATCH) không
    const isWriteAction = ["post", "put", "delete", "patch"].includes(
      config.method?.toLowerCase() || ""
    );

    // LOGIC BẢO VỆ: Nếu định ghi dữ liệu mà chưa đăng nhập thì chặn lại
    if (isWriteAction && !userId) {
      // Ngoại trừ các API đăng nhập/đăng ký (nếu dùng chung apiClient)
      const isAuthPath = config.url?.includes("/users/login") || config.url?.includes("/users/register");
      
      if (!isAuthPath) {
        toast.error("Vui lòng đăng nhập để thực hiện tính năng này!");
        // Trì hoãn một chút để người dùng kịp đọc toast rồi mới nhảy trang
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1000);
        return Promise.reject("Unauthorized: Please login.");
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- INTERCEPTOR CHO RESPONSE (SAU KHI NHẬN KẾT QUẢ) ---
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý các lỗi chung từ server (ví dụ 401 Unauthorized)
    if (error.response?.status === 401) {
      toast.error("Phiên đăng nhập hết hạn!");
      localStorage.clear();
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
