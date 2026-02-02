import Constants from "expo-constants";
import { Platform } from "react-native";

const isDevelopment = __DEV__;

// For web: use localhost with HTTPS
// For iOS Simulator: use localhost with HTTP
// For physical devices: use network IP
const getDevApiUrl = () => {
  if (Platform.OS === "web") {
    return "https://localhost:7258/";
  }

  // In Expo Go on physical devices, we need to use the network IP
  // Check if running in Expo Go (storeClient) vs development build
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  if (isExpoGo) {
    // Expo Go on physical device - needs network IP
    return "http://10.0.1.4:5197/";
  }

  // Simulator or development build - can use localhost
  return "http://localhost:5197/";
};

const PROD_API_URL = "https://postdanmark.mercantec.tech/";

export const API_BASE_URL = isDevelopment ? getDevApiUrl() : PROD_API_URL;

export const config = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment,
};
