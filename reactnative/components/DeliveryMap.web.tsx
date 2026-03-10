// components/DeliveryMap.web.tsx

// 1. THE TOOLBOX 🧰
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'; // Standard UI blocks
import * as Location from 'expo-location'; // The GPS Tool
import type { RouteStopInput } from './DeliveryMap.native';
import { getRoadRouteLeaflet } from '@/services/roadRouting';
import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';

interface MapStop {
    id: number;
    title: string;
    lat: number;
    lng: number;
    backendStopId?: number;
}

// **** ALLAN ****
// Konverterer RouteStopInput til MapStop format.
function routeStopsToMapStops(routeStops: RouteStopInput[]): MapStop[] {
    return routeStops
        .sort((a, b) => a.sequence - b.sequence)
        .map((stop, index) => ({
            id: stop.sequence ?? index + 1,
            title: stop.address || `Stop ${index + 1}`,
            lat: stop.latitude,
            lng: stop.longitude,
            backendStopId: stop.id,
        }));
}

const DEFAULT_STOPS: MapStop[] = [
    { id: 1, title: "Stop 1", lat: 57.00569, lng: 9.88305 },
    { id: 2, title: "Stop 2", lat: 57.03934, lng: 9.90931 },
    { id: 3, title: "Stop 3", lat: 57.03472, lng: 9.85347 },
];

interface DeliveryMapProps {
    initialStops?: RouteStopInput[] | null;
}

export default function DeliveryMap({ initialStops }: DeliveryMapProps) {

    // 2. THE BRAIN (STATE & MEMORY) 🧠

    // SPECIAL WEB MEMORY: 
    // On the phone, we have the map tools immediately. 
    // On the web, we have to "order" them and wait for them to arrive.
    // These start as 'null' (empty) until the browser finishes loading.
    const [MapModule, setMapModule] = useState<any>(null);
    const [LeafletModule, setLeafletModule] = useState<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    // Memory: Where is the user right now?
    const [userLocation, setUserLocation] = useState<any>(null);

    // Memory: The List of Packages (The Manifest). Uses route stops when provided.
    const [stops, setStops] = useState(() =>
        initialStops && initialStops.length > 0 ? routeStopsToMapStops(initialStops) : DEFAULT_STOPS
    );

    // Road-following route (real roads, fastest, no ferries when supported)
    const [routePositions, setRoutePositions] = useState<[number, number][] | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);

    useEffect(() => {
        if (initialStops && initialStops.length > 0) {
            setStops(routeStopsToMapStops(initialStops));
        } else {
            setStops(DEFAULT_STOPS);
        }
    }, [initialStops]);

    // Fetch road route when stops change
    const fetchRoadRoute = useCallback(async () => {
        if (stops.length < 2) {
            setRoutePositions(stops.length === 1 ? [[stops[0].lat, stops[0].lng]] : null);
            return;
        }
        setRouteLoading(true);
        setRoutePositions(null);
        try {
            // **** ALLAN ****
            // Indhent rute geometri mellem stoppestederne langs veje via getRoadRouteLeaflet.
            // Returnerer en liste af punkter langs ruten.
            const positions = await getRoadRouteLeaflet(stops.map((s) => ({ lat: s.lat, lng: s.lng })));
            setRoutePositions(positions);
        } catch {
            setRoutePositions(stops.map((s) => [s.lat, s.lng] as [number, number]));
        } finally {
            setRouteLoading(false);
        }
    }, [stops]);

    useEffect(() => {
        fetchRoadRoute();
    }, [fetchRoadRoute]);

    // Fallback: straight line if no road route (e.g. while loading or on error)
    const positions = routePositions ?? stops.map(stop => [stop.lat, stop.lng] as [number, number]);

    // 3. THE ROBOT (EFFECTS) 🤖

    // EFFECT 1: The "Sneaky" Loader
    // We cannot import 'leaflet' at the top of the file because it requires a "Window".
    // Servers don't have Windows. So we wait until we are sure we are in a Browser.
    useEffect(() => {
        (async () => {
            // Check: Are we in a browser?
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                try {
                    // Ensure Leaflet CSS is loaded (Metro/Expo Web doesn't support CSS imports)
                    const ensureCss = () => new Promise<void>((resolve, reject) => {
                        const id = 'leaflet-css-cdn';
                        if (document.getElementById(id)) return resolve();
                        const link = document.createElement('link');
                        link.id = id;
                        link.rel = 'stylesheet';
                        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                        link.onload = () => resolve();
                        link.onerror = () => reject(new Error('Failed to load Leaflet CSS'));
                        document.head.appendChild(link);
                    });

                    await ensureCss();

                    // "Lazy Load": Import the heavy map tools now
                    const Lmod = await import('leaflet');
                    const RLmod = await import('react-leaflet');

                    // Normalize ESM/CJS default exports
                    const L: any = (Lmod as any).default ?? Lmod;
                    const RL: any = (RLmod as any).default ?? RLmod;

                    // BUG FIX: Leaflet has a known bug where marker icons disappear in React.
                    // This code manually forces the icons to appear.
                    const DefaultIcon = L.icon({
                        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                        iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
                        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    });
                    L.Marker.prototype.options.icon = DefaultIcon;

                    // Save the tools into Memory so we can use them below
                    setLeafletModule(L);
                    setMapModule(RL);
                } catch (error) {
                    console.error("Fejl ved indlæsning af kort:", error);
                    const msg = (error instanceof Error) ? error.message : String(error);
                    setLoadError(msg);
                }
            }
        })();
    }, [attempt]);

    // EFFECT 2: The GPS Tracker
    useEffect(() => {
        (async () => {
            // Ask Browser for permission
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return; // If no, do nothing

            // Watch the user's movement (Updates every 1 second or 1 meter)
            await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
                (location) => setUserLocation(location.coords)
            );
        })();
    }, []);

    // 4. THE ACTIONS (FUNCTIONS) ⚡
    const handleDelivery = async (stop: MapStop) => {
        // Opdater stop-status i backend, så deliveryroutes kan vise checkmark (Delivered = 2)
        if (stop.backendStopId != null) {
            try {
                const token = await getToken();
                if (token) {
                    await fetch(`${API_BASE}/api/StopStatus/stop/${stop.backendStopId}`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ stopStatusId: 2 }), // 2 = Delivered
                    });
                }
            } catch (e) {
                console.warn('Kunne ikke opdatere stop-status:', e);
            }
        }
        // Create a new list without the delivered package
        const newStops = stops.filter(s => s.id !== stop.id);
        setStops(newStops);
    };

    // 5. THE END SCREEN (WIN CONDITION) 🏆
    // This MUST stay below the `useEffect` hooks to avoid the "Rendered fewer hooks" error.
    if (stops.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={{fontSize: 40}}>🎉</Text>
                <Text style={styles.title}>Godt arbejde!</Text>
                <Text>Du har leveret alle pakker på Web.</Text>

                <TouchableOpacity
                    style={styles.button}
                    // "window.location.reload()" is the Web-way of restarting the app
                    onPress={() => window.location.reload()}
                >
                    <Text style={styles.buttonText}>Start Forfra</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 6. THE LOADING / ERROR SCREENS ⏳
    // If the loader failed, show a retry UI.
    if (loadError) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.title}>Kunne ikke indlæse kortet</Text>
                <Text style={{ marginTop: 8, marginBottom: 16, textAlign: 'center' }}>{String(loadError)}</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        setLoadError(null);
                        setMapModule(null);
                        setLeafletModule(null);
                        setAttempt((a) => a + 1);
                    }}
                >
                    <Text style={styles.buttonText}>Prøv igen</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // If the "Sneaky Loader" hasn't finished fetching Leaflet yet, show this.
    if (!MapModule || !LeafletModule) {
        return <View style={styles.centerContainer}><Text>Indlæser kort...</Text></View>;
    }

    // Unpack the tools from Memory so we can use them easily
    const { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } = MapModule;

    // Initial map focus: first stop when we have a route, else default
    const firstStop = stops[0];
    const mapCenter: [number, number] = firstStop
        ? [firstStop.lat, firstStop.lng]
        : [57.02350, 9.87903];

    // 7. THE MAIN SCREEN (RENDER) 🎨
    return (
        <View style={styles.container}>
            {routeLoading && (
                <View style={styles.routeLoading}>
                    <Text style={styles.routeLoadingText}>Beregner rute ad vejene...</Text>
                </View>
            )}
            {/* RAW CSS INJECTION */}
            {/* React Native Web sometimes struggles with Map styles. 
                We use a standard HTML <style> tag to force the map to behave. */}
            <style>{`
                .leaflet-container { height: 100%; width: 100%; z-index: 1; }
                .deliver-btn { 
                  background-color: #0000FF; 
                  color: white; 
                  border: none; 
                  padding: 8px 12px; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  margin-top: 5px;
                }
            `}</style>

            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                {/* The "Skin" of the map (OpenStreetMap is free) */}
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* The Blue Line: follows real roads (fastest route, no ferries) */}
                
                {/* **** ALLAN **** */}
                {/* Tegner den blå linje langs ruten. */}
                <Polyline positions={positions} pathOptions={{ color: 'blue', weight: 4 }} />

                {/* The Pins */}
                {stops.map((stop) => (
                    <Marker key={stop.id} position={[stop.lat, stop.lng]}>
                        <Popup>
                            {/* NOTE: Inside Leaflet Popup, we use HTML (div, button), not React Native! */}
                            <div style={{textAlign: 'center'}}>
                                <strong>{stop.title}</strong>
                                <br />
                                <button
                                    className="deliver-btn"
                                    onClick={() => handleDelivery(stop)}
                                >
                                    Lever Pakke 📦
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* The User's Blue Dot */}
                {userLocation && (
                    <CircleMarker
                        center={[userLocation.latitude, userLocation.longitude]}
                        radius={10}
                        pathOptions={{ color: 'white', fillColor: '#2196F3', fillOpacity: 1, weight: 3 }}
                    >
                        <Popup>Her er jeg!</Popup>
                    </CircleMarker>
                )}

            </MapContainer>
        </View>
    );
}

// 8. THE STYLING 💅
const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    button: {
        backgroundColor: '#0000FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    routeLoading: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    routeLoadingText: {
        fontSize: 14,
        color: '#333',
    },
});