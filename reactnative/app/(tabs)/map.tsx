import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import DeliveryMap from '@/components/DeliveryMap';
import type { RouteStopInput } from '@/components/DeliveryMap.native';

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
