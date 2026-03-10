import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import DeliveryMap from '@/components/DeliveryMap';
import type { RouteStopInput } from '@/components/DeliveryMap.native';

// **** ALLAN ****
// Læser stoppesteder fra URL-parameteren og konverterer dem til RouteStopInput format.
export default function MapScreen() {
    const { stops: stopsParam } = useLocalSearchParams<{ stops?: string }>();

    const initialStops = useMemo((): RouteStopInput[] | null => {
        if (!stopsParam || typeof stopsParam !== 'string') return null;
        try {
            const parsed = JSON.parse(stopsParam) as RouteStopInput[];
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
        } catch {
            return null;
        }
    }, [stopsParam]);

    return <DeliveryMap initialStops={initialStops} />;
}
