import Constants from 'expo-constants';

const isDevelopment = __DEV__;

// For iOS/Android simulator/device, use your machine's IP address instead of localhost
// Update this IP address to match your development machine's local IP
const DEV_API_URL = 'http://10.0.1.4:7258/';
const PROD_API_URL = 'https://postdanmark.mercantec.tech/';

export const API_BASE_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

export const config = {
  apiBaseUrl: API_BASE_URL,
  isDevelopment,
};
