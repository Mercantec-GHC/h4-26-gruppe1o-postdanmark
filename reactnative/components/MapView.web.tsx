import React, { forwardRef, useEffect, useMemo, useRef as useReactRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';

// Web implementation using Leaflet via CDN (no extra npm deps)
// Keeps a similar API surface: default MapView and named Marker, Polyline.

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapViewProps = {
  initialRegion?: Region;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  style?: any;
  children?: React.ReactNode;
};

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  onPress?: () => void;
  children?: React.ReactNode;
};

type PolylineProps = {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
};

// Lightweight marker/polyline components as declarative placeholders
export const Marker: React.FC<MarkerProps> = () => null;
(Marker as any).displayName = 'RNMapsMarker';

export const Polyline: React.FC<PolylineProps> = () => null;
(Polyline as any).displayName = 'RNMapsPolyline';

// Helper: load Leaflet CSS/JS from CDN once
let leafletLoading: Promise<void> | null = null;
function ensureLeaflet(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  if ((window as any).L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;

    let done = false;
    const onReady = () => {
      if (done) return;
      done = true;
      resolve();
    };
    script.onload = onReady;
    script.onerror = reject;

    document.head.appendChild(link);
    document.body.appendChild(script);
  });
  return leafletLoading;
}

function deltaToZoom(delta: number): number {
  // Very rough conversion: smaller delta -> higher zoom.
  const clamped = Math.max(0.001, Math.min(60, delta));
  const zoom = 12 - Math.log2(clamped);
  return Math.max(1, Math.min(19, Math.round(zoom)));
}

 
// Expose an imperative handle compatible with react-native-maps' animateToRegion
// eslint-disable-next-line react/display-name
const MapView = forwardRef<any, MapViewProps>((props, ref) => {
  const { style, children, initialRegion } = props;
  const containerRef = useReactRef<HTMLDivElement>(null);
  const mapRef = useReactRef<any>(null);
  const layerGroupRef = useReactRef<any>(null);

  // Expose animateToRegion to mimic react-native-maps API
  useImperativeHandle(ref, () => ({
    animateToRegion: (region: Region, durationMs?: number) => {
      const map = mapRef.current;
      if (!map || !region) return;
      const zoom = deltaToZoom(region.latitudeDelta ?? 0.0922);
      const latlng: [number, number] = [region.latitude, region.longitude];
      const durationSec = typeof durationMs === 'number' ? Math.max(0, durationMs) / 1000 : undefined;
      if (durationSec && durationSec > 0) {
        // Leaflet animation in seconds
        map.flyTo(latlng, zoom, { duration: durationSec });
      } else {
        map.setView(latlng, zoom);
      }
    },
  }), []);

  const childArray = useMemo(() => React.Children.toArray(children) as any[], [children]);

  useEffect(() => {
    let cancelled = false;
    ensureLeaflet().then(() => {
      if (cancelled) return;
      const L = (window as any).L;
      if (!L) return;

      if (!mapRef.current && containerRef.current) {
        const center = [
          initialRegion?.latitude ?? 0,
          initialRegion?.longitude ?? 0,
        ];
        const zoom = initialRegion ? deltaToZoom(initialRegion.latitudeDelta || 0.0922) : 12;
        const map = L.map(containerRef.current).setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapRef.current = map;
        layerGroupRef.current = L.layerGroup().addTo(map);
      }

      // Rebuild layers from children
      const group = layerGroupRef.current;
      if (group) {
        group.clearLayers();
        childArray.forEach((child) => {
          const typeName = (child?.type as any)?.displayName;
          if (typeName === 'RNMapsMarker') {
            const p = child.props as MarkerProps;
            const { latitude, longitude } = p.coordinate || {} as any;
            if (typeof latitude === 'number' && typeof longitude === 'number') {
              const marker = (window as any).L.marker([latitude, longitude]);
              if (p.title || p.description) {
                marker.bindPopup(`<b>${p.title ?? ''}</b><div>${p.description ?? ''}</div>`);
              }
              if (p.onPress) {
                marker.on('click', () => p.onPress && p.onPress());
              }
              marker.addTo(group);
            }
          } else if (typeName === 'RNMapsPolyline') {
            const p = child.props as PolylineProps;
            const coords = (p.coordinates || []).map((c) => [c.latitude, c.longitude]);
            if (coords.length >= 2) {
              const poly = (window as any).L.polyline(coords, {
                color: p.strokeColor || '#3388ff',
                weight: p.strokeWidth || 3,
              });
              poly.addTo(group);
            }
          }
        });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childArray, initialRegion?.latitude, initialRegion?.longitude, initialRegion?.latitudeDelta]);

  useEffect(() => {
    return () => {
      // Cleanup map on unmount
      const map = mapRef.current;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  return (
    <View ref={ref} style={[styles.map, style]}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
});

export default MapView;

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
});
