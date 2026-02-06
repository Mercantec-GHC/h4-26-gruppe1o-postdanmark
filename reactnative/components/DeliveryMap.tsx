// components/DeliveryMap.tsx
// Platform-bridging proxy to satisfy TypeScript and ensure correct runtime resolution
import { Platform } from 'react-native';

let Component: any;

if (Platform.OS === 'web') {
  // Dynamically require the web implementation to avoid SSR/import issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Component = require('./DeliveryMap.web').default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Component = require('./DeliveryMap.native').default;
}

export default Component;
