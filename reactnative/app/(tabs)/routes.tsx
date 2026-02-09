import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getUser, isAdmin } from '@/services/userStorage';

// Route Overview screen to replace the old Explore tab
export default function RouteOverviewScreen() {
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [routes, setRoutes] = useState([
    { id: 1, date: '1. januar 2026', stops: 12, completed: true },
    { id: 2, date: '2. januar 2026', stops: 15, completed: false },
    { id: 3, date: '3. januar 2026', stops: 10, completed: false },
    { id: 4, date: '4. januar 2026', stops: 12, completed: true },
    { id: 5, date: '5. januar 2026', stops: 13, completed: true },
  ]);

  const toggleCompletion = (id: number) => {
    setRoutes(prev => prev.map(route => (route.id === id ? { ...route, completed: !route.completed } : route)));
  };

  useEffect(() => {
    getUser().then((user) => setIsAdminUser(user != null && isAdmin(user.role)));
  }, []);

  const handleViewPress = (route: { id: number; date: string; stops: number; completed: boolean }) => {
    // TODO: Navigate to route details when available
    console.log('View route:', route);
  };

  const handleCreateRoute = () => {
    router.push('/(tabs)/createroutes');
  };

  const RouteItem = ({ route }: { route: { id: number; date: string; stops: number; completed: boolean } }) => (
    <View style={styles.routeCard}>
      <View style={styles.routeHeader}>
        <Text style={styles.dateText}>{route.date}</Text>
        <View style={styles.stopBadge}>
          <Text style={styles.stopText}>Stop: {route.stops}</Text>
        </View>
      </View>

      <View style={styles.routeFooter}>
        <View style={styles.checkboxContainer}>
          {/* Custom Checkbox */}
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: route.completed }}
            style={[styles.customCheckbox, route.completed && styles.checkboxChecked]}
            onPress={() => toggleCompletion(route.id)}
          >
            {route.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.completedText}>Gennemført</Text>
        </View>

        <TouchableOpacity style={styles.viewButton} onPress={() => handleViewPress(route)}>
          <Text style={styles.viewButtonText}>Vis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vælg dato for rute</Text>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {routes.map(route => (
          <RouteItem key={route.id} route={route} />
        ))}
      </ScrollView>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  stopBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stopText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1976d2',
  },
  routeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#1976d2',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedText: {
    fontSize: 16,
    color: '#333',
  },
  viewButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
