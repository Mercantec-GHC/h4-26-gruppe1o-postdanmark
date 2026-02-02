import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error('Failed to save token:', error);
    return false;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

export async function deleteToken(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return true;
  } catch (error) {
    console.error('Failed to delete token:', error);
    return false;
  }
}
