import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { API_BASE } from "@/services/config";
import { getToken } from "@/services/tokenStorage";
import { getUser, isAdmin } from "@/services/userStorage";

// 1. IMPORTER KAMÆLEONERNE 🦎
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// ... (Interfaces StopStatus, Stop, DeliveryRoute) ...
interface StopStatus {
  name: string;
}
interface Stop {
  address: string;
  latitude: number;
  longitude: number;
  sequence: number;
  status: StopStatus;
}
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

function getUserIdFromToken(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.userId ?? decoded.nameid ?? decoded.sub;
    return userId ? Number(userId) : null;
  } catch {
    return null;
  }
}

export default function DeliveryRoutesScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminKnown, setAdminKnown] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    getUser().then((user) => {
      setIsAdminUser(user != null && isAdmin(user.role));
      setAdminKnown(true);
    });
  }, []);

  const fetchRoutes = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) {
        setError("Ikke autentificeret. Log venligst ind.");
        return;
      }
      const userId = getUserIdFromToken(token);
      if (!userId) {
        setError("Kunne ikke bestemme bruger. Log venligst ind igen.");
        return;
      }
      setCurrentUserId(userId);
      const url = isAdminUser
          ? `${API_BASE}/api/DeliveryRoute`
          : `${API_BASE}/api/DeliveryRoute/assigned/${userId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Kunne ikke hente ruter (${res.status})`);
      const data: DeliveryRoute[] = await res.json();
      setRoutes(data);
    } catch (e: any) {
      console.error("Error fetching delivery routes:", e);
      setError(e?.message || "Kunne ikke indlæse ruter.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (adminKnown) fetchRoutes();
  }, [adminKnown, fetchRoutes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutes();
  }, [fetchRoutes]);

  const handleCreateRoute = () => {
    router.push("/(tabs)/createroutes");
  };

  const deleteRoute = async (item: DeliveryRoute) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/DeliveryRoute/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRoutes((prev) => prev.filter((r) => r.id !== item.id));
      } else {
        Alert.alert("Fejl", "Kunne ikke slette ruten.");
      }
    } catch (e: any) {
      Alert.alert("Fejl", e?.message || "Kunne ikke slette ruten.");
    }
  };

  const handleDeleteRoute = (item: DeliveryRoute) => {
    const message = `Er du sikker på, at du vil slette ruten "${item.name || "Uden navn"}"?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) deleteRoute(item);
    } else {
      Alert.alert("Slet rute", message, [
        { text: "Annuller", style: "cancel" },
        { text: "Slet", style: "destructive", onPress: () => deleteRoute(item) },
      ]);
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName?.toLowerCase()) {
      case "completed": return "#4caf50";
      case "active": return "#ff9800";
      case "assigned": return "#2196f3";
      case "pending": return "#78909c";
      case "cancelled": return "#d32f2f";
      default: return "#9e9e9e";
    }
  };

  const updateRouteStatus = async (routeId: number, routeStatusId: number) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/RouteStatus/route/${routeId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ routeStatusId }),
      });
      if (res.ok) fetchRoutes();
      else Alert.alert("Fejl", "Kunne ikke opdatere status.");
    } catch (e: any) {
      Alert.alert("Fejl", e?.message || "Kunne ikke opdatere status.");
    }
  };

  const getNextAction = (item: DeliveryRoute) => {
    switch (item.routeStatusId) {
      case 2: return { label: "Start rute", statusId: 3, color: "#fff", bgColor: "#ff9800" };
      case 3: return { label: "Fuldfør rute", statusId: 4, color: "#fff", bgColor: "#4caf50" };
      default: return null;
    }
  };

  const canCancel = (item: DeliveryRoute) => item.routeStatusId === 2 || item.routeStatusId === 3;

  const handleCancelRoute = (item: DeliveryRoute) => {
    const message = `Er du sikker på, at du vil annullere ruten "${item.name || "Uden navn"}"?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) updateRouteStatus(item.id, 5);
    } else {
      Alert.alert("Annuller rute", message, [
        { text: "Nej", style: "cancel" },
        { text: "Ja, annuller", style: "destructive", onPress: () => updateRouteStatus(item.id, 5) },
      ]);
    }
  };

  const handleRoutePress = (item: DeliveryRoute) => {
    if (item.stops && item.stops.length > 0) {
      router.push({
        pathname: "/(tabs)/map",
        params: { stops: JSON.stringify(item.stops) },
      } as unknown as Parameters<typeof router.push>[0]);
    }
  };

  const renderRoute = ({ item }: { item: DeliveryRoute }) => (
      // 2. KORTET: Vi bruger ThemedView her. 
      // Den bliver automatisk Hvid (Light) eller Mørkegrå (Dark).
      <ThemedView style={styles.card}>
        <TouchableOpacity
            onPress={() => handleRoutePress(item)}
            activeOpacity={0.8}
            disabled={!item.stops || item.stops.length === 0}
            style={styles.cardTouchable}
        >
          <View style={styles.cardHeader}>
            {/* 3. TEKST: Skiftede Text til ThemedText (type=subtitle) */}
            <ThemedText type="subtitle" style={styles.routeName}>{item.name}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statusName) }]}>
              <Text style={styles.statusText}>{item.statusName}</Text>
            </View>
          </View>

          <View style={styles.cardDetails}>
            {isAdminUser && (
                <View style={styles.detailRow}>
                  {/* 4. LABELS: Vi bruger lightColor/darkColor props til labels for at gøre dem grå */}
                  <ThemedText lightColor="#666" darkColor="#9BA1A6" style={styles.detailLabel}>Tildelt:</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.assignedUserName ?? "Ingen"}</ThemedText>
                </View>
            )}
            <View style={styles.detailRow}>
              <ThemedText lightColor="#666" darkColor="#9BA1A6" style={styles.detailLabel}>Planlagt dato:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {item.scheduledDate ? item.scheduledDate.split("T")[0].split("-").reverse().join("-") : "Ikke planlagt"}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText lightColor="#666" darkColor="#9BA1A6" style={styles.detailLabel}>Afstand:</ThemedText>
              <ThemedText style={styles.detailValue}>{item.totalDistanceKm.toFixed(1)} km</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText lightColor="#666" darkColor="#9BA1A6" style={styles.detailLabel}>Estimeret varighed:</ThemedText>
              <ThemedText style={styles.detailValue}>{Math.round(item.estimatedDurationMinutes)} min</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText lightColor="#666" darkColor="#9BA1A6" style={styles.detailLabel}>Stop:</ThemedText>
              <ThemedText style={styles.detailValue}>{item.stops?.length ?? 0}</ThemedText>
            </View>
          </View>

          {item.stops && item.stops.length > 0 && (() => {
            const sorted = [...item.stops].sort((a, b) => a.sequence - b.sequence);
            const isExpanded = expandedCards.has(item.id);
            const visibleStops = isExpanded ? sorted : sorted.slice(0, 3);
            const hasMore = sorted.length > 3;
            return (
                <View style={styles.stopsList}>
                  <ThemedText type="defaultSemiBold" style={styles.stopsHeader}>Stop</ThemedText>
                  {visibleStops.map((stop, index) => (
                      <View key={index} style={styles.stopItem}>
                        <Text style={styles.stopSequence}>{stop.sequence}.</Text>
                        <View style={styles.stopInfo}>
                          <ThemedText style={styles.stopAddress}>{stop.address}</ThemedText>
                          {stop.status && <Text style={styles.stopStatus}>{stop.status.name}</Text>}
                        </View>
                      </View>
                  ))}
                  {hasMore && (
                      <TouchableOpacity
                          style={styles.expandButton}
                          onPress={() => {
                            setExpandedCards((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            });
                          }}
                      >
                        <Text style={styles.expandButtonText}>{isExpanded ? "Vis færre" : `Vis alle ${sorted.length} stop`}</Text>
                      </TouchableOpacity>
                  )}
                </View>
            );
          })()}
        </TouchableOpacity>

        {/* Actions (Knapper) - Beholdes som de er, de har deres egne farver */}
        {(() => {
          const isAssignedToMe = currentUserId != null && item.assignedUserId === currentUserId;
          const nextAction = isAssignedToMe ? getNextAction(item) : null;
          const showCancel = isAssignedToMe && canCancel(item);
          const showDelete = isAdminUser;
          if (!nextAction && !showCancel && !showDelete) return null;
          return (
              <View style={styles.cardActions}>
                {nextAction && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: nextAction.bgColor }]}
                        onPress={() => updateRouteStatus(item.id, nextAction.statusId)}
                    >
                      <Text style={[styles.actionBtnText, { color: nextAction.color }]}>{nextAction.label}</Text>
                    </TouchableOpacity>
                )}
                {showCancel && (
                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleCancelRoute(item)}>
                      <Text style={styles.cancelBtnText}>Annuller</Text>
                    </TouchableOpacity>
                )}
                {showDelete && (
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteRoute(item)}>
                      <Text style={styles.deleteBtnText}>Slet</Text>
                    </TouchableOpacity>
                )}
              </View>
          );
        })()}
      </ThemedView>
  );

  // 5. HEADER & CONTAINER: Vi bruger lightColor/darkColor props
  // lightColor="#f5f5f5": Lysegrå baggrund i Light Mode (som før)
  // darkColor="#000": Helt sort baggrund i Dark Mode
  return (
      <ThemedView lightColor="#f5f5f5" darkColor="#000" style={{ flex: 1 }}>
        <SafeAreaView style={styles.safeArea}>

          {/* Header bruger standard ThemedView (Hvid i light, Mørkegrå i dark) */}
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>
              {isAdminUser ? "Alle Leveringsruter" : "Mine Leveringsruter"}
            </ThemedText>
            {isAdminUser && (
                <TouchableOpacity style={styles.addButton} onPress={handleCreateRoute}>
                  <IconSymbol name="plus" size={28} color="#1976d2" />
                </TouchableOpacity>
            )}
          </ThemedView>

          {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1e88e5" />
                <ThemedText>Indlæser ruter...</ThemedText>
              </View>
          ) : error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
          ) : routes.length === 0 ? (
              <View style={styles.centered}>
                <ThemedText style={styles.emptyText}>
                  {isAdminUser ? "Ingen ruter." : "Ingen ruter tildelt til dig."}
                </ThemedText>
              </View>
          ) : (
              <FlatList
                  data={routes}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderRoute}
                  contentContainerStyle={styles.list}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
          )}
        </SafeAreaView>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Container behøver ikke background color mere (styres af ThemedView)
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    // backgroundColor fjernet (ThemedView styrer det)
  },
  headerTitle: {
    // color fjernet (ThemedText styrer det)
    fontSize: 24,
    fontWeight: "600",
  },
  addButton: { padding: 8 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    // backgroundColor fjernet
  },
  list: { padding: 16, gap: 12 },
  card: {
    // backgroundColor fjernet (ThemedView styrer det)
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  cardTouchable: { flex: 1 },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  actionBtnText: { fontSize: 14, fontWeight: "600" },
  cancelBtn: { backgroundColor: "#fff3e0" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#e65100" },
  deleteBtn: { backgroundColor: "#ffebee" },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: "#c62828" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  routeName: { flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "500" },
  stopsList: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 },
  stopsHeader: { marginBottom: 8 },
  stopItem: { flexDirection: "row", paddingVertical: 4, alignItems: "flex-start" },
  stopSequence: { fontSize: 13, fontWeight: "600", color: "#1e88e5", width: 24 },
  stopInfo: { flex: 1 },
  stopAddress: { fontSize: 13 },
  stopStatus: { fontSize: 11, color: "#888", marginTop: 2 },
  expandButton: { marginTop: 8, paddingVertical: 6, alignItems: "center" },
  expandButtonText: { fontSize: 13, fontWeight: "600", color: "#1e88e5" },
  errorText: { fontSize: 16, color: "#d32f2f", textAlign: "center" },
  emptyText: { fontSize: 16, textAlign: "center" },
});