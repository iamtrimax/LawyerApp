import storage from "../utils/storage";
import { createContext, useState, useEffect, useContext } from "react";
import { AppState } from "react-native";
import summaryAPI from "../common";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  //kiểm tra đăng nhập trước hay chưa
  useEffect(() => {
    const localStorageData = async () => {
      try {
        const storeUser = await storage.getItem("@AuthUser");
        const storeToken = await storage.getAuthToken();

        if (storeUser && storeToken) {
          setUser(JSON.parse(storeUser));
          setIsAuthenticated(true);
          // Only refresh if not already handled by screens
          await refreshUser(storeToken);
        }
      } catch (error) {
        console.error("lỗi đọc dữ liệu", error);
      } finally {
        setLoading(false);
      }
    };
    localStorageData();
  }, []);

  const refreshUser = async (passedToken) => {
    try {
      const token = passedToken || await storage.getAuthToken();
      if (!token) return;

      const response = await fetch(summaryAPI.getProfile.url, {
        method: summaryAPI.getProfile.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.log("Token expired or invalid, logging out...");
        await logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUser(prevUser => {
          const updated = { ...prevUser, ...data.data }; 
          storage.setItem("@AuthUser", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.log("Lỗi tự động làm mới profile:", error);
    }
  };

  const login = async (userData, accessToken, refreshToken) => {
    setUser(userData);
    setIsAuthenticated(true);
    await storage.setItem("@AuthUser", JSON.stringify(userData));
    await storage.setItem("@AuthToken", accessToken);
    if (refreshToken) {
      await storage.setItem("@RefreshToken", refreshToken);
    }
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await storage.clear();
  };

  const fetchUserDetail = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const response = await fetch(summaryAPI.lawyerDetail.url, {
        method: summaryAPI.lawyerDetail.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUser(prevUser => {
          const updated = { ...prevUser, ...data.lawyer };
          storage.setItem("@AuthUser", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.log("Lỗi fetch chi tiết:", error);
    }
  };

  const updateUser = async (newData) => {
    setUser(prevUser => {
      const updated = { ...prevUser, ...newData };
      storage.setItem("@AuthUser", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        fetchUserDetail,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
