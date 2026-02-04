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
                  <TouchableOpacity 
                        style={styles.button} 
                        onPress={finishDelivery}>  {/* close the white box*/}
                  <Text style={styles.buttonText}>Mark as Delivered</Text>
          </TouchableOpacity>

                  </View>
        )}
                  </View>
        );
     }

const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        
        map: {
            width: '100%',
                height: '100%',
        }, 
        
        card: {
            position: 'absolute',
                bottom: 20,
                left: 20,
                right: 20,
                backgroundColor: 'white',
                padding: 20,
                borderRadius: 15,
                shadowColor: '#000',
                elevation: 5,
        },
        cardTitle: {
            fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 10,
        },
        button: {
            backgroundColor: '#0000FF',
                padding: 10,
                borderRadius: 8,
                alignItems: 'center',
        },
        buttonText: {
            color: 'white',
                fontWeight: 'bold',
        }
    });