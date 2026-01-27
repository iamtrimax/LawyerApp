import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useState, useEffect, useContext } from "react";
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
        const storeUser = await AsyncStorage.getItem("@AuthUser");
        const storeToken = await AsyncStorage.getItem("@AuthToken");

        if (storeUser && storeToken) {
          setUser(JSON.parse(storeUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("lỗi đọc dữ liệu", error);
      } finally {
        setLoading(false);
      }
    };
    localStorageData();
  }, []);
  const login = async (userData, accessToken, refreshToken) => {
    setUser(prevUser => {
      const updated = { ...prevUser, ...userData };
      AsyncStorage.setItem("@AuthUser", JSON.stringify(updated));
      return updated;
    });
    setIsAuthenticated(true);
    await AsyncStorage.setItem("@AuthToken", accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem("@RefreshToken", refreshToken);
    }
  };
  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await AsyncStorage.clear()
  }
  // AuthProvider.js
  const fetchUserDetail = async () => {
    try {
      const token = await AsyncStorage.getItem("@AuthToken");
      if (!token) return;

      const response = await fetch(summaryAPI.lawyerDetail.url, {
        method: summaryAPI.lawyerDetail.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        // Dùng hàm để đảm bảo lấy user mới nhất trong state
        setUser(prevUser => {
          const updated = { ...prevUser, ...data.lawyer };
          // Lưu ngay vào máy để lần sau reload không bị lấy bản cũ
          AsyncStorage.setItem("@AuthUser", JSON.stringify(updated));
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
      AsyncStorage.setItem("@AuthUser", JSON.stringify(updated));
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
