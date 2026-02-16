import React, { useState, useEffect } from 'react';
import {
  View,
  // Text, <--- UDSKIFTES MED ThemedText
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
  FlatList,
  Text, // Vi beholder Text til nogle få steder (fx inde i knapper med fast farve), men bruger ThemedText til resten
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';
import { getUser } from '@/services/userStorage';

// 1. IMPORTER KAMÆLEONERNE 🦎
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type UserOption = { id: number; name: string; email: string };

export default function CreateRouteScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<string[]>(['', '']);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (user) setCurrentUserId(user.id);
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/User`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(
              (data as { id: number; name: string; email: string }[]).map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
              }))
          );
        }
      } catch (e) {
        console.error('Failed to load users', e);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  const selectedUser = users.find((u) => u.id === assignedUserId);
  const assignedUserLabel = assignedUserId === null ? 'Vælg...' : (selectedUser?.name ?? 'Vælg...');

  const addAddress = () => setAddresses((prev) => [...prev, '']);
  const removeAddress = (index: number) => {
    if (addresses.length <= 1) return;
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  };
  const setAddress = (index: number, value: string) => {
    setAddresses((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    const trimmedAddresses = addresses.map((a) => a.trim()).filter(Boolean);
    if (trimmedAddresses.length === 0) {
      Alert.alert('Fejl', 'Tilføj mindst én adresse.');
      return;
    }
    if (!scheduledDate.trim()) {
      Alert.alert('Fejl', 'Angiv en dato.');
      return;
    }
    if (!assignedUserId && users.length > 0) {
      Alert.alert('Fejl', 'Vælg den bruger, der skal tildeles ruten.');
      return;
    }
    if (currentUserId == null) {
      Alert.alert('Fejl', 'Kunne ikke identificere bruger.');
      return;
    }

    const dateMatch = scheduledDate.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!dateMatch) {
      Alert.alert('Fejl', 'Dato skal være i formatet DD-MM-ÅÅÅÅ (f.eks. 15-02-2026).');
      return;
    }
    const [, day, month, year] = dateMatch;
    const scheduledDateIso = `${year}-${month}-${day}`;

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Fejl', 'Du er ikke logget ind.');
        setSubmitting(false);
        return;
      }

      const body = {
        Name: name.trim() || `Rute ${scheduledDate}`,
        ScheduledDate: scheduledDateIso,
        UserId: currentUserId,
        AssignedUserId: assignedUserId ?? undefined,
        Stops: trimmedAddresses.map((Address) => ({ Address })),
      };

      const res = await fetch(`${API_BASE}/api/DeliveryRoute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const data = JSON.parse(text);
          msg = data.message ?? data.title ?? text;
        } catch {
          // keep msg as text
        }
        Alert.alert('Fejl ved oprettelse', msg);
        setSubmitting(false);
        return;
      }

      Alert.alert('Rute oprettet', 'Den nye rute er oprettet.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/deliveryroutes') },
      ]);
    } catch (e: unknown) {
      console.error('Create route error', e);
      Alert.alert('Fejl', (e as Error)?.message ?? 'Kunne ikke oprette rute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
      // 2. YDERSTE CONTAINER: ThemedView (Sort/Hvid baggrund)
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="default" />

          {/* Header Container */}
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.headerTitle}>Opret ny rute</ThemedText>
          </ThemedView>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Rutenavn */}
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Rutenavn (valgfri)</ThemedText>
              <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="F.eks. Rute Nord"
                  placeholderTextColor="#888"
              />
            </View>

            {/* Dato */}
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Dato (DD-MM-ÅÅÅÅ)</ThemedText>
              <TextInput
                  style={styles.input}
                  value={scheduledDate}
                  onChangeText={setScheduledDate}
                  placeholder="15-02-2026"
                  placeholderTextColor="#888"
              />
            </View>

            {/* Vælg Bruger (Dropdown) */}
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Tildel bruger</ThemedText>
              {loadingUsers ? (
                  <ActivityIndicator size="small" color="#1976d2" style={styles.loader} />
              ) : (
                  <>
                    <Pressable
                        style={styles.dropdownTrigger}
                        onPress={() => setUserDropdownOpen(true)}
                    >
                      <Text style={styles.dropdownTriggerText}>{assignedUserLabel}</Text>
                      <Text style={styles.dropdownChevron}>▼</Text>
                    </Pressable>

                    <Modal
                        visible={userDropdownOpen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setUserDropdownOpen(false)}
                    >
                      <Pressable style={styles.dropdownBackdrop} onPress={() => setUserDropdownOpen(false)}>
                        {/* Selve menuen bliver nu også ThemedView */}
                        <ThemedView style={styles.dropdownModal}>
                          <ThemedText type="subtitle" style={styles.dropdownModalTitle}>Vælg bruger</ThemedText>
                          <FlatList
                              data={[{ id: null, name: 'Vælg...', email: '' }, ...users]}
                              keyExtractor={(item) => (item.id === null ? '_none' : String(item.id))}
                              renderItem={({ item }) => (
                                  <Pressable
                                      style={[styles.dropdownItem, assignedUserId === item.id && styles.dropdownItemActive]}
                                      onPress={() => {
                                        setAssignedUserId(item.id);
                                        setUserDropdownOpen(false);
                                      }}
                                  >
                                    <ThemedText style={[styles.dropdownItemText, assignedUserId === item.id && styles.dropdownItemTextActive]}>
                                      {item.name}
                                    </ThemedText>
                                  </Pressable>
                              )}
                              style={styles.dropdownList}
                          />
                          <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setUserDropdownOpen(false)}>
                            <Text style={styles.dropdownCloseBtnText}>Luk</Text>
                          </TouchableOpacity>
                        </ThemedView>
                      </Pressable>
                    </Modal>
                  </>
              )}
            </View>

            {/* Adresser */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Adresser</ThemedText>
                <TouchableOpacity onPress={addAddress} style={styles.addAddressBtn}>
                  <Text style={styles.addAddressBtnText}>+ Tilføj adresse</Text>
                </TouchableOpacity>
              </View>
              {addresses.map((addr, index) => (
                  <View key={index} style={styles.addressRow}>
                    <TextInput
                        style={[styles.input, styles.addressInput]}
                        value={addr}
                        onChangeText={(v) => setAddress(index, v)}
                        placeholder={`Adresse ${index + 1}`}
                        placeholderTextColor="#888"
                    />
                    <TouchableOpacity
                        onPress={() => removeAddress(index)}
                        style={styles.removeBtn}
                        disabled={addresses.length <= 1}
                    >
                      <Text style={[styles.removeBtnText, addresses.length <= 1 && styles.removeBtnTextDisabled]}>Fjern</Text>
                    </TouchableOpacity>
                  </View>
              ))}
            </View>

            {/* Knapper */}
            <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
              {submitting ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <Text style={styles.submitBtnText}>Opret rute</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(tabs)/deliveryroutes')}>
              <Text style={styles.cancelBtnText}>Annuller</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
  );
}

// ---------------------------------------------------------
// STYLES
// Fjernet faste baggrundsfarver og tekstfarver, hvor ThemedView/Text tager over
// ---------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#f5f5f5', <--- SLETTET
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    // backgroundColor: '#fff', <--- SLETTET (ThemedView styrer det)
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    // fontSize: 24, fontWeight: '600' osv. styres nu af type="title" i ThemedText, men vi kan beholde lidt layout styles hvis nødvendigt
    // color: '#333', <--- SLETTET
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    // fontSize: 16, fontWeight: '500', color: '#333' <--- SLETTET (styres af ThemedText)
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff', // Beholder hvide inputfelter for kontrast
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333', // Tekst inde i inputtet forbliver mørk
    ...(Platform.select({ web: { outlineStyle: 'none' } as Record<string, unknown>, default: {} }) as object),
  },
  addressInput: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeBtnText: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '500',
  },
  removeBtnTextDisabled: {
    color: '#999',
  },
  addAddressBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addAddressBtnText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownChevron: {
    fontSize: 12,
    color: '#666',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownModal: {
    // backgroundColor: '#fff', <--- SLETTET (ThemedView styrer det)
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownModalTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // color: '#333', <--- SLETTET
  },
  dropdownList: {
    maxHeight: 280,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#e3f2fd', // Aktiv farve beholder vi (lyseblå)
  },
  dropdownItemText: {
    fontSize: 16,
    // color: '#333', <--- SLETTET
  },
  dropdownItemTextActive: {
    color: '#1976d2',
    fontWeight: '600',
  },
  dropdownCloseBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  dropdownCloseBtnText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 12,
  },
  submitBtn: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    color: '#666',
  },
});