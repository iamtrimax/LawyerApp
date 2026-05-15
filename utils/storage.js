import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/**
 * Universal storage helper to handle Native (AsyncStorage) and Web (localStorage)
 * Ensures reliably synchronized and fast retrieval of authentication tokens.
 */
const storage = {
  /**
   * Retrieves an item from storage
   * @param {string} key 
   * @returns {Promise<string|null>}
   */
  getItem: async (key) => {
    let value = isWeb && typeof window !== 'undefined'
      ? localStorage.getItem(key)
      : await AsyncStorage.getItem(key);
    
    if (value === "null" || value === "undefined" || value === "") return null;
    return value;
  },

  /**
   * Saves an item to storage
   * @param {string} key 
   * @param {string} value 
   * @returns {Promise<void>}
   */
  setItem: async (key, value) => {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  /**
   * Removes an item from storage
   * @param {string} key 
   * @returns {Promise<void>}
   */
  removeItem: async (key) => {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },

  /**
   * Clears all storage
   * @returns {Promise<void>}
   */
  clear: async () => {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.clear();
      return;
    }
    await AsyncStorage.clear();
  },

  /**
   * Helper to get authentication token
   * @returns {Promise<string|null>}
   */
  getAuthToken: async () => {
    let token = isWeb && typeof window !== 'undefined'
      ? localStorage.getItem("@AuthToken")
      : await AsyncStorage.getItem("@AuthToken");
    
    // Sanitize token
    if (token === "null" || token === "undefined" || token === "") return null;
    return token ? token.trim() : null;
  }
};

export default storage;
