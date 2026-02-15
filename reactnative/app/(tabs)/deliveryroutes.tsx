import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';
import { getUser, isAdmin } from '@/services/userStorage';

// TypeScript interfaces der matcher API-responsens datastruktur

// Status for et enkelt stop (f.eks. "Afleveret", "Afventer")
interface StopStatus {
  name: string;
}

// Et enkelt stop på en leveringsrute
interface Stop {
  address: string;
  latitude: number;
  longitude: number;
  sequence: number;
  status: StopStatus;
}

// En leveringsrute med alle tilhørende oplysninger
interface DeliveryRoute {
  id: number;
  name: string;
  scheduledDate: string;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  userId: number;
  assignedUserId: number | null;
  assignedUserName?: string | null;
  routeStatusId: number;
  statusName: string;
  stops: Stop[];
}

/**
 * Dekoder JWT-tokenet og udtrækker brugerens ID fra payload.
 * Tokenet er base64-kodet, så vi splitter på '.', tager payload-delen
 * og dekoder den for at hente userId.
 */
function getUserIdFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.userId ?? decoded.nameid ?? decoded.sub;
    return userId ? Number(userId) : null;
  } catch {
    return null;
  }
}

export default function DeliveryRoutesScreen() {
  const router = useRouter();
  // State til at holde styr på ruter, indlæsning, opdatering og fejl
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminKnown, setAdminKnown] = useState(false);

  useEffect(() => {
    getUser().then((user) => {
      setIsAdminUser(user != null && isAdmin(user.role));
      setAdminKnown(true);
    });
  }, []);

  /**
   * Henter leveringsruter: admin får alle ruter, andre får kun tildelte ruter.
   */
  const fetchRoutes = useCallback(async () => {
    try {
      setError(null);

      const token = await getToken();
      if (!token) {
        setError('Ikke autentificeret. Log venligst ind.');
        return;
      }

      const userId = getUserIdFromToken(token);
      if (!userId) {
        setError('Kunne ikke bestemme bruger. Log venligst ind igen.');
        return;
      }

      const url = isAdminUser
        ? `${API_BASE}/api/DeliveryRoute`
        : `${API_BASE}/api/DeliveryRoute/assigned/${userId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Kunne ikke hente ruter (${res.status})`);
      }

      const data: DeliveryRoute[] = await res.json();
      setRoutes(data);
    } catch (e: any) {
      console.error('Error fetching delivery routes:', e);
      setError(e?.message || 'Kunne ikke indlæse ruter.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdminUser]);

  // Hent ruter når admin-status er kendt (undgår dobbelt fetch)
  useEffect(() => {
    if (adminKnown) fetchRoutes();
  }, [adminKnown, fetchRoutes]);

  // Håndterer pull-to-refresh funktionalitet
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutes();
  }, [fetchRoutes]);

  const handleCreateRoute = () => {
    router.push('/(tabs)/createroutes');
  };

  const handleDeleteRoute = (item: DeliveryRoute) => {
    Alert.alert(
      'Slet rute',
      `Er du sikker på, at du vil slette ruten "${item.name || 'Uden navn'}"?`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            try {
              const res = await fetch(`${API_BASE}/api/DeliveryRoute/${item.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setRoutes((prev) => prev.filter((r) => r.id !== item.id));
              } else {
                Alert.alert('Fejl', 'Kunne ikke slette ruten.');
              }
            } catch (e: any) {
              Alert.alert('Fejl', e?.message || 'Kunne ikke slette ruten.');
            }
          },
        },
      ]
    );
  };

  // Returnerer en farve baseret på rutens status
  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case 'completed':
        return '#4caf50'; // Grøn for fuldført
      case 'in progress':
        return '#ff9800'; // Orange for igangværende
      case 'pending':
        return '#2196f3'; // Blå for afventende
      default:
        return '#9e9e9e'; // Grå for ukendt status
    }
  };

  // Navigerer til kort-fanen med rutens stop så kortet viser adresserne
  const handleRoutePress = (item: DeliveryRoute) => {
    if (item.stops && item.stops.length > 0) {
      router.push({
        pathname: '/(tabs)/map',
        params: { stops: JSON.stringify(item.stops) },
      } as unknown as Parameters<typeof router.push>[0]);
    }
  };

  // Renderer et enkelt rute-kort i listen
  const renderRoute = ({ item }: { item: DeliveryRoute }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => handleRoutePress(item)}
        activeOpacity={0.8}
        disabled={!item.stops || item.stops.length === 0}
        style={styles.cardTouchable}
      >
        {/* Kort-header med rutenavn og statusbadge */}
        <View style={styles.cardHeader}>
          <Text style={styles.routeName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statusName) }]}>
            <Text style={styles.statusText}>{item.statusName}</Text>
          </View>
        </View>

        {/* Rutedetaljer: dato, afstand, varighed, antal stop og (for admin) tildelt bruger */}
        <View style={styles.cardDetails}>
          {isAdminUser && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tildelt:</Text>
              <Text style={styles.detailValue}>{item.assignedUserName ?? 'Ingen'}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Planlagt dato:</Text>
            <Text style={styles.detailValue}>
              {item.scheduledDate
                ? item.scheduledDate.split('T')[0].split('-').reverse().join('-')
                : 'Ikke planlagt'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Afstand:</Text>
            <Text style={styles.detailValue}>{item.totalDistanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimeret varighed:</Text>
            <Text style={styles.detailValue}>{Math.round(item.estimatedDurationMinutes)} min</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stop:</Text>
            <Text style={styles.detailValue}>{item.stops?.length ?? 0}</Text>
          </View>
        </View>

        {/* Liste over stop, sorteret efter rækkefølge */}
        {item.stops && item.stops.length > 0 && (
          <View style={styles.stopsList}>
            <Text style={styles.stopsHeader}>Stop</Text>
            {item.stops
              .sort((a, b) => a.sequence - b.sequence)
              .map((stop, index) => (
                <View key={index} style={styles.stopItem}>
                  <Text style={styles.stopSequence}>{stop.sequence}.</Text>
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopAddress}>{stop.address}</Text>
                    {stop.status && (
                      <Text style={styles.stopStatus}>{stop.status.name}</Text>
                    )}
                  </View>
                </View>
              ))}
          </View>
        )}
      </TouchableOpacity>
      {isAdminUser && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteRoute(item)}
          accessibilityLabel="Slet rute"
        >
          <Text style={styles.deleteBtnText}>Slet</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Vis indlæsningsindikator mens data hentes
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leveringsruter</Text>
          {isAdminUser && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateRoute}
              accessibilityLabel="Opret ny rute"
            >
              <IconSymbol name="plus" size={28} color="#1976d2" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1e88e5" />
          <Text style={styles.loadingText}>Indlæser ruter...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Vis fejlbesked hvis noget gik galt
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mine Leveringsruter</Text>
          {isAdminUser && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateRoute}
              accessibilityLabel="Opret ny rute"
            >
              <IconSymbol name="plus" size={28} color="#1976d2" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Hovedvisning med liste af leveringsruter
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mine Leveringsruter</Text>
        {isAdminUser && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateRoute}
            accessibilityLabel="Opret ny rute"
          >
            <IconSymbol name="plus" size={28} color="#1976d2" />
          </TouchableOpacity>
        )}
      </View>
      {routes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {isAdminUser ? 'Ingen ruter.' : 'Ingen ruter tildelt til dig.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoute}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  cardTouchable: {
    flex: 1,
  },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c62828',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  stopsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  stopsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  stopSequence: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e88e5',
    width: 24,
  },
  stopInfo: {
    flex: 1,
  },
  stopAddress: {
    fontSize: 13,
    color: '#333',
  },
  stopStatus: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
