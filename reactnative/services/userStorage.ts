import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const USER_KEY = "user_info";

export async function saveUser(user: StoredUser): Promise<boolean> {
  try {
    const json = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem(USER_KEY, json);
    } else {
      await SecureStore.setItemAsync(USER_KEY, json);
    }
    return true;
  } catch (error) {
    console.error("Failed to save user:", error);
    return false;
  }
}

export async function getUser(): Promise<StoredUser | null> {
  try {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
}

export async function deleteUser(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
    return true;
  } catch (error) {
    console.error("Failed to delete user:", error);
    return false;
  }
}

export function isAdmin(role: string): boolean {
  return role === "Admin";
}
