import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE } from '@/services/config';
import { getToken } from '@/services/tokenStorage';
import { getUser } from '@/services/userStorage';

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

    const dateMatch = scheduledDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      Alert.alert('Fejl', 'Dato skal være i formatet ÅÅÅÅ-MM-DD (f.eks. 2026-02-15).');
      return;
    }

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
        ScheduledDate: scheduledDate.trim(),
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
        { text: 'OK', onPress: () => router.replace('/(tabs)/routes') },
      ]);
    } catch (e: unknown) {
      console.error('Create route error', e);
      Alert.alert('Fejl', (e as Error)?.message ?? 'Kunne ikke oprette rute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Opret ny rute</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Rutenavn (valgfri)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="F.eks. Rute Nord"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Dato (ÅÅÅÅ-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="2026-02-15"
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tildel bruger</Text>
          {loadingUsers ? (
            <ActivityIndicator size="small" color="#1976d2" style={styles.loader} />
          ) : (
            <View style={styles.pickerWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                <TouchableOpacity
                  style={[styles.pickerOption, assignedUserId === null ? styles.pickerOptionActive : null]}
                  onPress={() => setAssignedUserId(null)}
                >
                  <Text style={[styles.pickerOptionText, assignedUserId === null ? styles.pickerOptionTextActive : null]}>
                    Vælg...
                  </Text>
                </TouchableOpacity>
                {users.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.pickerOption, assignedUserId === u.id ? styles.pickerOptionActive : null]}
                    onPress={() => setAssignedUserId(u.id)}
                  >
                    <Text style={[styles.pickerOptionText, assignedUserId === u.id ? styles.pickerOptionTextActive : null]}>
                      {u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Adresser</Text>
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

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Annuller</Text>
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    ...Platform.select({ web: { outlineStyle: 'none' as const }, default: {} }),
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
  pickerWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerScroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  pickerOptionActive: {
    backgroundColor: '#1976d2',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextActive: {
    color: '#fff',
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
