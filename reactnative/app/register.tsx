import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE } from '../services/config';
import { playSoundEffect } from '../services/soundEffects';

// 1. IMPORTER KAMÆLEONERNE
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // ... (validate function er uændret) ...
  const validate = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Udfyld alle felter.'); return false;
    }
    if (name.length < 3 || name.length > 32) {
      setError('Brugernavn skal være mellem 3 og 32 tegn.'); return false;
    }
    if (!USERNAME_REGEX.test(name)) {
      setError('Brugernavn må kun indeholde bogstaver, tal, _, . og -.'); return false;
    }
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(email)) {
      setError('Indtast en gyldig e-mailadresse.'); return false;
    }
    if (password.length < 8) {
      setError('Adgangskoden skal være mindst 8 tegn.'); return false;
    }
    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke.'); return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setError(null);
    setSuccess(false);
    if (!validate()) {
      playSoundEffect(require("../sound-effects/error.wav"));
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/Auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Registration failed (${res.status})`);
      }
      setSuccess(true);
      playSoundEffect(require("../sound-effects/honk-honk.wav"));
      Alert.alert('Konto oprettet', 'Din konto er oprettet. Du kan nu logge ind.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e: any) {
      console.error('Register error', e);
      setError(e?.message || 'Registration failed');
      playSoundEffect(require("../sound-effects/error.wav"));
      Alert.alert('Registration failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => router.replace('/login');

  return (
      // 2. YDERSTE CONTAINER: ThemedView (Hvid/Sort baggrund)
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

            {/* 3. OVERSKRIFT */}
            <ThemedText type="title" style={styles.welcomeText}>Opret konto</ThemedText>

            {/* INPUTS - Labels er nu ThemedText */}
            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Brugernavn</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="3-32 tegn (bogstaver, tal, _, . eller -)"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Email</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Indtast din e-mail"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Adgangskode</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Mindst 8 tegn"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Bekræft adgangskode</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Gentag adgangskoden"
                    placeholderTextColor="#888"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                />
              </View>
            </View>

            {!!success && <Text style={styles.successText}>Kontoen blev oprettet!</Text>}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Register</Text>}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              {/* 4. BUNDTEKST: ThemedText så den kan ses i mørke */}
              <ThemedText style={styles.loginPrompt}>Har du allerede en konto?</ThemedText>
              <TouchableOpacity onPress={goToLogin} disabled={loading}>
                <Text style={styles.loginText}>Log ind</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff', <--- SLETTET
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 32,
    // fontWeight: 'bold', <--- ThemedText type="title" klarer dette
    // color: '#000',      <--- SLETTET
    textAlign: 'center',
    marginBottom: 40,
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '700' },
      android: { fontFamily: 'sans-serif-medium', fontWeight: '700' },
      default: {},
    }),
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    // color: '#333', <--- SLETTET
    // fontWeight beholder vi måske, men ThemedText type="defaultSemiBold" klarer det også
  },
  inputWrapper: {
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 0,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif' },
      default: {},
    }),
  },
  successText: {
    color: '#2e7d32',
    marginBottom: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
    fontSize: 14,
  },
  registerButton: {
    height: 50,
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loginRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginPrompt: {
    fontSize: 14,
    // color: '#333', <--- SLETTET
  },
  loginText: {
    fontSize: 14,
    color: '#1e88e5',
    fontWeight: '600',
  },
});

export default RegisterScreen;