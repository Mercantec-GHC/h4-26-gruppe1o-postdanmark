import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Token Storage Helper
 *
 * Håndterer sikker lagring af authentication tokens på tværs af platforme:
 * - iOS: Bruger Keychain (krypteret, hardware-beskyttet)
 * - Android: Bruger Keystore + EncryptedSharedPreferences (krypteret)
 * - Web: Bruger localStorage
 */

const TOKEN_KEY = "auth_token";

/**
 * Gemmer authentication token sikkert
 * @param token - JWT token fra login response
 * @returns true hvis token blev gemt, false ved fejl
 */
export async function saveToken(token: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      // Web: Bruger localStorage til browser-support
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      // Mobil: SecureStore krypterer automatisk via OS'ets sikre lagring
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
 * Bruges til at vedhæfte token til API-kald (Authorization header)
 * @returns Token string hvis fundet, null hvis ikke gemt eller ved fejl
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
 * Bruges ved logout for at rydde brugerens session
 * @returns true hvis token blev slettet, false ved fejl
 */
export async function deleteToken(): Promise<boolean> {
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
