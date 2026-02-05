// app/(tabs)/index.tsx
import { View, StyleSheet } from 'react-native';
// Notice the path: Go up (..) out of tabs, up (..) out of app, into components
import DeliveryMap from '../../components/DeliveryMap';
export default function MapScreen() {
    return (
        <View style={styles.container}>
            <DeliveryMap />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});