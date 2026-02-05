// Cross-platform MapView entry that TypeScript can resolve
// Delegates to platform-specific implementations at runtime
import { Platform } from 'react-native';

// Use require to avoid static resolution issues
let MapViewModule: any;
if (Platform.OS === 'web') {
  MapViewModule = require('./MapView.web');
} else {
  MapViewModule = require('./MapView.native');
}

const MapView = MapViewModule.default || MapViewModule;
const { Marker, Polyline } = MapViewModule;

export default MapView;
export { Marker, Polyline };
