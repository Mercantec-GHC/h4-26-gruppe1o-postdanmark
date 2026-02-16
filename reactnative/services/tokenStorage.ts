import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "auth_token";

/**
 * Gemmer authentication token sikkert
 */
export async function saveToken(token: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
    return true;
  } catch (error) {
    console.error("Failed to save token:", error);
    return false;
  }
}

/**
 * Henter gemt authentication token
 */
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get token:", error);
    return null;
  }
}

/**
 * Sletter gemt authentication token
 * Vi kalder denne 'removeToken' så den matcher det, vi importerer i Settings
 */
export async function removeToken(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return true;
  } catch (error) {
    console.error("Failed to delete token:", error);
    return false;
  }
}