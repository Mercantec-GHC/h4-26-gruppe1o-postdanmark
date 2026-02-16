import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';


// 1. VORES KAMÆLEONER 🦎
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// 2. VÆRKTØJER TIL DATABASEN
import { getUser, removeUser } from '@/services/userStorage';
import { removeToken } from '@/services/tokenStorage';

export default function SettingsScreen() {
    const router = useRouter();

    // Hukommelse til brugerens info
    const [userInfo, setUserInfo] = useState<{ name: string; email: string; role: string } | null>(null);

    // Når siden åbner: Hent brugerens navn frem
    useEffect(() => {
        async function loadUser() {
            const user = await getUser();
            if (user) {
                setUserInfo({
                    name: user.name || 'Ukendt Postbud',
                    email: user.email || 'Ingen email',
                    role: user.role || 'Medarbejder'
                });
            }
        }
        loadUser();
    }, []);

    // LOG UD FUNKTIONEN 🚪
    const handleLogout = async () => {
        // Hvis vi er på Web (Browseren) 💻
        if (Platform.OS === 'web') {
            const confirm = window.confirm("Er du sikker på, at du vil logge ud?");
            if (confirm) {
                await removeToken();
                await removeUser();
                router.replace('/login');
            }
        }
        // Hvis vi er på Mobil (iOS/Android) 📱
        else {
            Alert.alert(
                "Log ud",
                "Er du sikker på, at du vil logge ud?",
                [
                    { text: "Annuller", style: "cancel" },
                    {
                        text: "Log ud",
                        style: "destructive",
                        onPress: async () => {
                            await removeToken();
                            await removeUser();
                            router.replace('/login');
                        }
                    }
                ]
            );
        }
    };

    return (
        <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>

                {/* OVERSKRIFT */}
                <ThemedView style={styles.header}>
                    <ThemedText type="title">Indstillinger</ThemedText>
                </ThemedView>

                {/* PROFIL KORT (Viser hvem der er logget ind) */}
                <ThemedView style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Min Profil</ThemedText>

                    <View style={styles.profileCard}>
                        <View style={styles.avatarCircle}>
                            <ThemedText style={styles.avatarText}>
                                {userInfo?.name?.charAt(0) ?? "?"}
                            </ThemedText>
                        </View>
                        <View style={styles.profileInfo}>
                            <ThemedText type="defaultSemiBold">{userInfo?.name ?? "Henter..."}</ThemedText>
                            <ThemedText style={{ color: '#666' }}>{userInfo?.role ?? "..."}</ThemedText>
                            <ThemedText style={{ color: '#888', fontSize: 12 }}>{userInfo?.email ?? ""}</ThemedText>
                        </View>
                    </View>
                </ThemedView>

                {/* LOG UD KNAP (Den Røde Knap) */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <IconSymbol name="arrow.right.circle.fill" size={24} color="#d32f2f" />
                    <ThemedText style={styles.logoutText}>Log ud</ThemedText>
                </TouchableOpacity>

            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 30,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#33333320', // Let gennemsigtig streg
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        marginBottom: 15,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#33333310', // Let grå baggrund til kortet (virker i begge modes)
        borderRadius: 12,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1e88e5', // PostDanmark Blå
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d32f2f', // Rød kant
        marginTop: 'auto', // Skubber knappen helt ned i bunden
    },
    logoutText: {
        color: '#d32f2f',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 10,
    },
});