import Constants from "expo-constants";
import { Platform } from "react-native";

const isDevelopment = __DEV__;

// For web: brug localhost med HTTPS
// For iOS Simulator: brug localhost med HTTP
// For fysiske enheder: brug netværks-IP
const getDevApiUrl = () => {
  if (Platform.OS === "web") {
    return "https://localhost:7258/";
  }

  // I Expo Go på fysiske enheder skal vi bruge netværks-IP
  // Tjek om vi kører i Expo Go (storeClient) vs development build
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  if (isExpoGo) {
    // Expo Go på fysisk enhed - skal bruge netværks-IP
    return "http://10.0.1.4:5197/";
  }

  // Simulator eller development build - kan bruge localhost
  return "http://localhost:5197/";
};

const PROD_API_URL = "https://postdanmark.mercantec.tech/";

export const API_BASE_URL = isDevelopment ? getDevApiUrl() : PROD_API_URL;

export const config = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment,
};
