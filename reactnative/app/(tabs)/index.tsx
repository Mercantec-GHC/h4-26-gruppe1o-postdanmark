import { StyleSheet, View, Alert, Text, TouchableOpacity } from 'react-native';     //standard building blocks. View is the box, StyleSheet is the styling tool.
import MapView, { Marker, Polyline } from 'react-native-maps';  //This is the 'Pin'. I need this to show where the package stops are.
import { useState, useEffect, useRef } from 'react'; // Added these for "Memory" and "Robot"
import * as Location from 'expo-location';  // The GPS Tool

export default function MapScreen() {
    
        // 1. STATE: Memories
        // We need to know if we are allowed to use GPS. 
        // We start by assuming "false" (Not allowed yet).
        const [hasPermission, setHasPermission] = useState(false);
        //Animate the camera. After deleting the app, remote and fly to the new first item in the list.
        const mapRef = useRef<MapView>(null);
        // New Memory: Which stop did the user click? (Starts as null)
        const [selectedStop, setSelectedStop] = useState<any>(null);
        
      //Testing Fake Data
      // 2. DATA: A list of stops (simulating what comes from the Database later)
      const [stops, setStops] = useState([
        { id: 1, title: "Stop 1", lat: 57.00569, lng: 9.88305 }, // Skalborg
        { id: 2, title: "Stop 2", lat: 57.03934, lng: 9.90931 }, // Aalborg Universitets Hospital
        { id: 3, title: "Stop 3", lat: 57.03472, lng: 9.85347 }, // Aeblevangsskoven 
      ]);

      // 3. EFFECT: The Robot that asks for permission
      useEffect(() => {
          (async () => {
              // Ask the phone system for permission
              let { status } = await Location.requestForegroundPermissionsAsync();
    
              if (status !== 'granted') {
                  Alert.alert('Permission needed', 'We need your location to show the route!');
                  return;
              }
              // If we get here, the user said YES.
              setHasPermission(true);
            })();
        }, []); // The empty [] means: "Only run this ONE time when the app opens"
        
    
        //  4. FUNCTION: handle the delivery
        const finishDelivery = () => {
            //Create a new list keeping everything EXCEPT the selected ID
            const newStops = stops.filter(stop => stop.id !== selectedStop.id);
           
            //Update the list
            setStops(newStops); // This will automatically remove the pin from the map
           
            //close the card
            setSelectedStop(null); // Close the white box after delivery
            
            //Move the map to the next stop, if there is one
            if (newStops.length > 0) {
                const nextStop = newStops[0];
                mapRef.current?.animateToRegion({
                    latitude: nextStop.lat,
                    longitude: nextStop.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }, 1000);
            }
            Alert.alert('Great job!', 'One less stop to go.');
        }

    // Tjek om ruten er færdig 
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
        
      return (
          <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: 57.02350,
                  longitude: 9.87903,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
            }}
                //Only show the blue dot if we have permission
                showsUserLocation={hasPermission}
                showsMyLocationButton={true}
        > 
                
            <Polyline 
                coordinates={stops.map(stop => ({ latitude: stop.lat, longitude: stop.lng }))}
                strokeColor="#0000FF"
                strokeWidth={3}
                />
            {stops.map((stop) => (
            <Marker 
                key={stop.id} 
                coordinate={{ latitude: stop.lat, longitude: stop.lng }} 
                title={stop.title} 
                description={`This is stop number ${stop.id}`}
                
                //When clicked. save this stop into our memory
                onPress={() => setSelectedStop(stop)} 
            />
            ))}
        </MapView>
          
            {/* The CARD: If we have a selected stop, show its details */}
              {selectedStop && (
                  <View style={styles.card}>
                  <Text style={styles.cardTitle}>{selectedStop.title}</Text>
                  <Text style={styles.cardText}>Klar til levering?</Text>
                      
                  <TouchableOpacity 
                        style={styles.button} 
                        onPress={finishDelivery}>
                  <Text style={styles.buttonText}>Marker som leveret</Text>
          </TouchableOpacity>

                  </View>
        )}
                  </View>
        );
     }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white', // Sikrer hvid baggrund
    },
    map: {
        width: '100%',
        height: '100%',
    },
    // Styling til "Fyraften" skærmen
    doneContainer: {
        flex: 1,
        backgroundColor: 'white', // VIGTIGT: Tvinger hvid baggrund
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    doneTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'black', // Sikrer at teksten kan ses
        marginBottom: 10,
    },
    doneText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
    },
    // Styling til Leverings-kortet
    card: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
        backgroundColor: '#0000FF', // PostDanmark Blå
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});