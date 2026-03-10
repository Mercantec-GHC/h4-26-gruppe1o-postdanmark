/**
 * Road routing service: fetches driving routes that follow real roads.
 * Uses the backend API (which calls OSRM server-side) to avoid CORS; fastest route, no ferries when supported.
 */

import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface LatLng {
  lat: number;
  lng: number;
}

// **** ALLAN ****
// Indhent rute geometri mellem stoppestederne langs veje via POST getRoadRouteCoordinates.
export async function getRoadRouteLeaflet(stops: LatLng[]): Promise<[number, number][] | null> {
  const coords = await getRoadRouteCoordinates(stops);
  if (!coords) return null;
  return coords.map((c) => [c.lat, c.lng] as [number, number]);
}

// **** ALLAN ****
// Indhent rute geometri mellem stoppestederne langs veje via POST getRoadRouteCoordinates.
export async function getRoadRouteNative(stops: LatLng[]): Promise<{ latitude: number; longitude: number }[] | null> {
  const coords = await getRoadRouteCoordinates(stops);
  if (!coords) return null;
  return coords.map((c) => ({ latitude: c.lat, longitude: c.lng }));
}


async function getRoadRouteCoordinates(stops: LatLng[]): Promise<LatLng[] | null> {
  if (stops.length < 2) return stops.length === 1 ? [stops[0]] : null;

  const token = await getToken();
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/api/Routing/road-geometry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const coords = data?.coordinates as Array<{ latitude: number; longitude: number }> | undefined;
        if (Array.isArray(coords) && coords.length > 0) {
          return coords.map((c) => ({ lat: c.latitude, lng: c.longitude }));
        }
      }
    } catch {
      // fall through to direct OSRM
    }
  }

  return getRoadRouteCoordinatesViaOsrm(stops);
}

/**
 * Direct OSRM call (works on native; on web often fails due to CORS).
 */
async function getRoadRouteCoordinatesViaOsrm(stops: LatLng[]): Promise<LatLng[] | null> {
  if (stops.length < 2) return stops.length === 1 ? [stops[0]] : null;

  const all: LatLng[] = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&exclude=ferry`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const fallbackUrl = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) return null;
        const data = await fallbackRes.json();
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates?.length) return null;
        const segment = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
        if (i > 0) segment.shift();
        all.push(...segment);
        continue;
      }
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route?.geometry?.coordinates?.length) return null;
      const segment = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      if (i > 0) segment.shift();
      all.push(...segment);
    } catch {
      return null;
    }
  }

  return all.length ? all : null;
}
