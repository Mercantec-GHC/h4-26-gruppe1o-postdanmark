import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const USER_KEY = 'user_info';

/**
 * Gemmer brugerinformation
 */
export async function saveUser(user: any) {
  const jsonValue = JSON.stringify(user);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(USER_KEY, jsonValue);
    } else {
      await SecureStore.setItemAsync(USER_KEY, jsonValue);
    }
    return true;
  } catch (error) {
    console.error("Failed to save user:", error);
    return false;
  }
}

/**
 * Henter gemt brugerinformation
 */
export async function getUser() {
  try {
    let jsonValue;
    if (Platform.OS === 'web') {
      jsonValue = localStorage.getItem(USER_KEY);
    } else {
      jsonValue = await SecureStore.getItemAsync(USER_KEY);
    }
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error("Error reading user", e);
    return null;
  }
}

/**
 * Sletter brugerinformation (Log ud)
 */
export async function removeUser() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
    return true;
  } catch (error) {
    console.error("Failed to remove user:", error);
    return false;
  }
}

/**
 * Hjælpefunktion til at tjekke om brugeren er Admin
 */
export function isAdmin(role: string | number): boolean {
  // Tjekker om rollen er "Admin" eller ID 2 (baseret på din database-logik)
  return role === "Admin" || role === 2 || role === "2";
}