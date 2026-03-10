// components/DeliveryMap.native.tsx

// 1. THE TOOLBOX 🧰
// These are the raw materials we need to build the screen.
import { StyleSheet, View, Alert, Text, TouchableOpacity } from 'react-native'; // Bricks (View), Paint (Style), and Text.
import MapView, { Marker, Polyline } from 'react-native-maps'; // The specific tools for Maps (The Map itself, Pins, and Lines).
import { useState, useEffect, useRef, useCallback } from 'react'; // The Brain: Memory (State), Automation (Effect), and Remote Control (Ref).
import * as Location from 'expo-location'; // The Sensor: Allows us to talk to the phone's GPS chip.
import { playSoundEffect } from '@/services/soundEffects';
import { getRoadRouteNative } from '@/services/roadRouting';
import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';

// Stop format when passed from the delivery routes screen (API shape)
export interface RouteStopInput {
    id?: number; // Backend stop Id – brugt til at opdatere status ved "Lever Pakke"
    address: string;
    latitude: number;
    longitude: number;
    sequence: number;
}

// Internal stop format used by the map (id for key/display, backendStopId for API)
interface MapStop {
    id: number;
    title: string;
    lat: number;
    lng: number;
    backendStopId?: number; // Database stop Id – bruges til API-kald ved levering
}

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

// Default fallback when no route is selected (same as previous hardcoded data)
const DEFAULT_STOPS: MapStop[] = [
    { id: 1, title: "Stop 1", lat: 57.00569, lng: 9.88305 },
    { id: 2, title: "Stop 2", lat: 57.03934, lng: 9.90931 },
    { id: 3, title: "Stop 3", lat: 57.03472, lng: 9.85347 },
];

interface DeliveryMapProps {
    /** When user selects a route on the delivery routes page, these stops are passed here. */
    initialStops?: RouteStopInput[] | null;
}

export default function DeliveryMap({ initialStops }: DeliveryMapProps) {

    // 2. THE BRAIN (STATE & MEMORY) 🧠

    // Memory: "Am I allowed to see where the user is?"
    // Starts as 'false' because we haven't asked yet.
    const [hasPermission, setHasPermission] = useState(false);

    // Remote Control: This lets us control the Map camera via code (e.g., "Fly to the next stop").
    const mapRef = useRef<MapView>(null);

    // Memory: "Which pin did the user just click on?"
    // Starts as null because nothing is clicked yet.
    const [selectedStop, setSelectedStop] = useState<MapStop | null>(null);

    // Memory: The List of Packages (The Manifest).
    // Uses addresses from the selected route when provided; otherwise fallback to default locations.
    const [stops, setStops] = useState<MapStop[]>(() =>
        initialStops && initialStops.length > 0
            ? routeStopsToMapStops(initialStops)
            : DEFAULT_STOPS
    );

    // Road-following route (real roads, fastest, no ferries when supported)
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [routeLoading, setRouteLoading] = useState(false);

    // When the user selects a different route on the delivery routes page, update the map stops.
    useEffect(() => {
        if (initialStops && initialStops.length > 0) {
            setStops(routeStopsToMapStops(initialStops));
            setSelectedStop(null);
        } else {
            setStops(DEFAULT_STOPS);
            setSelectedStop(null);
        }
    }, [initialStops]);

    // Fetch road route when stops change
    const fetchRoadRoute = useCallback(async () => {
        if (stops.length < 2) {
            setRouteCoordinates(stops.length === 1 ? [{ latitude: stops[0].lat, longitude: stops[0].lng }] : []);
            return;
        }
        setRouteLoading(true);
        setRouteCoordinates([]);
        try {
            // **** ALLAN ****
            // Indhent rute geometri mellem stoppestederne langs veje via POST getRoadRouteLeaflet.
            // Returnerer en liste af punkter langs ruten.
            const coords = await getRoadRouteNative(stops.map((s) => ({ lat: s.lat, lng: s.lng })));
            setRouteCoordinates(coords ?? stops.map((s) => ({ latitude: s.lat, longitude: s.lng })));
        } catch {
            setRouteCoordinates(stops.map((s) => ({ latitude: s.lat, longitude: s.lng })));
        } finally {
            setRouteLoading(false);
        }
    }, [stops]);

    useEffect(() => {
        fetchRoadRoute();
    }, [fetchRoadRoute]);

    const lineCoordinates = routeCoordinates.length > 0 ? routeCoordinates : stops.map(s => ({ latitude: s.lat, longitude: s.lng }));

    // Initial map region: focus on first stop when we have a route, else default
    const firstStop = stops[0];
    const initialRegion = firstStop
        ? {
            latitude: firstStop.lat,
            longitude: firstStop.lng,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        }
        : {
            latitude: 57.02350,
            longitude: 9.87903,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        };

    // When route (initialStops) changes, fly camera to the new first stop
    useEffect(() => {
        if (initialStops && initialStops.length > 0 && mapRef.current) {
            const sorted = [...initialStops].sort((a, b) => a.sequence - b.sequence);
            const first = sorted[0];
            mapRef.current.animateToRegion({
                latitude: first.latitude,
                longitude: first.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }, 500);
        }
    }, [initialStops]);

    // 3. THE ROBOT (EFFECTS) 🤖
    // This runs automatically exactly ONE time when the app starts (because of the empty [] at the end).
    useEffect(() => {
        (async () => {
            // Step A: Knock on the door and ask for GPS permission.
            let { status } = await Location.requestForegroundPermissionsAsync();

            // Step B: If they say no, complain and stop.
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'We need your location to show the route!');
                return;
            }
            // Step C: If they said YES, update our memory so the map knows it can turn on the Blue Dot.
            setHasPermission(true);
        })();
    }, []);


    // 4. THE ACTIONS (FUNCTIONS) ⚡
    // This happens when the user clicks the "Deliver Package" button.
    const finishDelivery = async () => {
        if (!selectedStop) return;
        const stopToComplete = selectedStop;

        // Opdater stop-status i backend, så deliveryroutes kan vise checkmark (Delivered = 2)
        if (stopToComplete.backendStopId != null) {
            try {
                const token = await getToken();
                if (token) {
                    await fetch(`${API_BASE}/api/StopStatus/stop/${stopToComplete.backendStopId}`, {
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

        // Logic: Create a NEW list that keeps everyone EXCEPT the one we just finished.
        const newStops = stops.filter(stop => stop.id !== stopToComplete.id);

        // Update Memory: Replace the old list with the shorter list.
        // (React will automatically re-draw the map and remove the pin).
        setStops(newStops);

        // UI Logic: Close the pop-up card because the delivery is done.
        setSelectedStop(null);

        // Play fanfare when all deliveries are complete
        if (newStops.length === 0) {
            playSoundEffect(require('@/sound-effects/fanfare.wav'));
        }

        // Camera Logic: If there are stops left, fly the camera to the next one automatically.
        if (newStops.length > 0) {
            const nextStop = newStops[0];
            // Use the "Remote Control" (mapRef) to animate the view.
            mapRef.current?.animateToRegion({
                latitude: nextStop.lat,
                longitude: nextStop.lng,
                latitudeDelta: 0.05, // How zoomed in (smaller number = closer)
                longitudeDelta: 0.05,
            }, 1000); // Take 1000ms (1 second) to fly there.
        }

        // Reward the user
        Alert.alert('Great job!', 'One less stop to go.');
    }

    // 5. THE END SCREEN (WIN CONDITION) 🏆
    // Before we draw the map, we check: Is the list empty?
    if (stops.length === 0) {
        return (
            <View style={styles.doneContainer}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.doneTitle}>Godt arbejde!</Text>
                <Text style={styles.doneText}>Du har leveret alle pakker.</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => Alert.alert("Rute afsluttet", "Du kan nu gå hjem eller hente en ny rute.")}
                >
                    <Text style={styles.buttonText}>Afslut Rute</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // 6. THE MAIN SCREEN (RENDER) 🎨
    return (
        <View style={styles.container}>
            {routeLoading && (
                <View style={styles.routeLoading}>
                    <Text style={styles.routeLoadingText}>Beregner rute ad vejene...</Text>
                </View>
            )}
            {/* The Window to the World */}
            <MapView
                ref={mapRef} // Connect the "Remote Control" to this map
                style={styles.map}
                initialRegion={initialRegion}
                // Only show the user's Blue Dot if we have permission
                showsUserLocation={hasPermission}
                showsMyLocationButton={true}
            >
                {/* The Blue Line: follows real roads (fastest route, no ferries) */}

                {/* **** ALLAN **** */}
                {/* Tegner den blå linje langs ruten. */}
                <Polyline
                    coordinates={lineCoordinates}
                    strokeColor="#0000FF"
                    strokeWidth={4}
                />

                {/* The Pins (We loop through our memory of 'stops' and draw a pin for each one) */}
                {stops.map((stop) => (
                    <Marker
                        key={stop.id} // React needs a unique ID for tracking
                        coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                        title={stop.title}
                        description={`This is stop number ${stop.id}`}

                        // Interaction: When clicked, play bubble sound and remember THIS specific stop
                        onPress={() => {
                            playSoundEffect(require('@/sound-effects/bubble.wav'));
                            setSelectedStop(stop);
                        }}
                    />
                ))}
            </MapView>

            {/* THE CARD (Conditional Rendering) */}
            {/* The '&&' means: "IF selectedStop exists (is not null), THEN show this View" */}
            {selectedStop && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{selectedStop.title}</Text>
                    <Text style={styles.cardText}>Klar til levering?</Text>

                    {/* The Button to trigger the finishDelivery function */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={finishDelivery}>
                        <Text style={styles.buttonText}>Lever Pakke 📦</Text>
                    </TouchableOpacity>

                </View>
            )}
        </View>
    );
}

// 7. THE STYLING (CSS) 💅
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    // Styles for the "Win" Screen
    doneContainer: {
        flex: 1,
        backgroundColor: 'white',
        justifyContent: 'center', // Center vertically
        alignItems: 'center',     // Center horizontally
        padding: 20,
    },
    emoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    doneTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 10,
    },
    doneText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
    },
    // Styles for the Floating Card
    card: {
        position: 'absolute', // "Float" on top of the map
        bottom: 30,           // 30 pixels from the bottom
        left: 20,
        right: 20,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        // Shadow for 3D effect (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // Shadow for Android
        elevation: 5,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    button: {
        backgroundColor: '#0000FF', // PostDanmark Blue
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
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