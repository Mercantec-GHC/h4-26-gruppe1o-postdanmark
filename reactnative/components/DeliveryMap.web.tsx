// components/DeliveryMap.web.tsx

// 1. THE TOOLBOX 🧰
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'; // Standard UI blocks
import * as Location from 'expo-location'; // The GPS Tool

export default function DeliveryMap() {

    // 2. THE BRAIN (STATE & MEMORY) 🧠

    // SPECIAL WEB MEMORY: 
    // On the phone, we have the map tools immediately. 
    // On the web, we have to "order" them and wait for them to arrive.
    // These start as 'null' (empty) until the browser finishes loading.
    const [MapModule, setMapModule] = useState<any>(null);
    const [LeafletModule, setLeafletModule] = useState<any>(null);

    // Memory: Where is the user right now?
    const [userLocation, setUserLocation] = useState<any>(null);

    // Memory: The List of Packages (The Manifest)
    const [stops, setStops] = useState([
        { id: 1, title: "Stop 1", lat: 57.00569, lng: 9.88305 }, // Skalborg
        { id: 2, title: "Stop 2", lat: 57.03934, lng: 9.90931 }, // Aalborg UH
        { id: 3, title: "Stop 3", lat: 57.03472, lng: 9.85347 }, // Aeblevangsskoven 
    ]);

    // Helper: Convert the list of stops into simple coordinates for the blue line
    const positions = stops.map(stop => [stop.lat, stop.lng] as [number, number]);

    // 3. THE ROBOT (EFFECTS) 🤖

    // EFFECT 1: The "Sneaky" Loader
    // We cannot import 'leaflet' at the top of the file because it requires a "Window".
    // Servers don't have Windows. So we wait until we are sure we are in a Browser.
    useEffect(() => {
        (async () => {
            // Check: Are we in a browser?
            if (typeof window !== 'undefined') {
                try {
                    // "Lazy Load": Import the heavy map tools now
                    const L = await import('leaflet');
                    const RL = await import('react-leaflet');

                    // Import the CSS (Styles) so the map doesn't look broken
                    require('leaflet/dist/leaflet.css');

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
                    console.error("Fejl:", error);
                }
            }
        })();
    }, []);

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
    const handleDelivery = (id: number) => {
        // Create a new list without the delivered package
        const newStops = stops.filter(s => s.id !== id);
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

    // 6. THE LOADING SCREEN ⏳
    // If the "Sneaky Loader" hasn't finished fetching Leaflet yet, show this.
    if (!MapModule || !LeafletModule) {
        return <View style={styles.centerContainer}><Text>Indlæser kort...</Text></View>;
    }

    // Unpack the tools from Memory so we can use them easily
    const { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } = MapModule;

    // 7. THE MAIN SCREEN (RENDER) 🎨
    return (
        <View style={styles.container}>
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
                center={[57.02350, 9.87903]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                {/* The "Skin" of the map (OpenStreetMap is free) */}
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* The Blue Line */}
                <Polyline positions={positions} pathOptions={{ color: 'blue' }} />

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
                                    onClick={() => handleDelivery(stop.id)}
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
    }
});