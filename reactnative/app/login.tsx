import { useRouter } from "expo-router";
// importerer vores "Kamæleon"-komponenter (De skifter selv farve)
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
//________________________________________________________________
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "../services/config";
import { playSoundEffect } from "../services/soundEffects";
import { saveToken } from "../services/tokenStorage";
import { saveUser } from "../services/userStorage";

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    // Simpel validering: Er felterne udfyldt?
    if (!email || !password) {
      setError("Please enter both email and password.");
      playSoundEffect(require("../sound-effects/error.wav"));
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // ---------------------------------------------------------
      // START: FEJL-OVERSÆTTEREN (Håndterer serverens svar)
      // ---------------------------------------------------------
      if (!res.ok) {
        // 1. Hent rå tekst som backup (hvis alt andet fejler)
        const text = await res.text();
        let errorMessage = text;

        try {
          // 2. Prøv at pakke gaven ud (Er det JSON format?)
          const data = JSON.parse(text);

          // CASE A: Vores egen kode (f.eks. "Forkert password")
          if (data.message) {
            errorMessage = data.message;
          }
          // CASE B: Systemets validering (f.eks. "Ugyldig email")
          // Vi finder den første fejl i listen og viser den.
          else if (data.errors) {
            const firstErrorKey = Object.keys(data.errors)[0];
            if (firstErrorKey) {
              errorMessage = data.errors[firstErrorKey][0];
            }
          }
          // CASE C: Generel titel (Sidste udvej)
          else if (data.title) {
            errorMessage = data.title;
          }
        } catch (e) {
          // 3. Hvis det ikke er JSON, gør vi ingenting og beholder rå tekst.
        }

        // 4. Kast den pæne besked videre til brugeren
        throw new Error(errorMessage || `Login failed (${res.status})`);
      }
      // ---------------------------------------------------------
      // SLUT: FEJL-OVERSÆTTEREN
      // ---------------------------------------------------------

      const data = await res.json();

      // Gem login-info (Token og Bruger) på telefonen
      if (data.token) {
        await saveToken(data.token);
      }
      if (data.user) {
        await saveUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role ?? "Employee",
        });
      }

      playSoundEffect(require("../sound-effects/honk-honk.wav"));
      router.replace("/(tabs)/deliveryroutes"); // Send brugeren ind i appen

    } catch (e: any) {
      console.error("Login error", e);
      setError(e?.message || "Login failed");
      playSoundEffect(require("../sound-effects/error.wav"));
      Alert.alert("Login failed", e?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log("Forgot password pressed");
    // TODO: Add your forgot password logic here
  };

  const goToRegister = () => {
    router.push("/register");
  };

  return (
      // 1. YDERSTE LAG: ThemedView
      // Denne sørger for baggrundsfarven. 
      // Hvis telefonen er i Dark Mode -> Bliver den mørkegrå (#151718).
      // Hvis telefonen er i Light Mode -> Bliver den hvid (#fff).
      <ThemedView style={{ flex: 1 }}>

        <SafeAreaView style={styles.container}>
          <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
          >
            <Image
                source={require('../assets/images/PostDanmark.png')}
                style={styles.logo}
            />

            {/* 2. OVERSKRIFT: ThemedText
              type="title" gør den stor og fed.
              Den skifter selv farve mellem sort og hvid. */}
            <ThemedText type="title" style={styles.welcomeText}>Velkommen!</ThemedText>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              {/* Label skifter også farve automatisk */}
              <ThemedText type="defaultSemiBold" style={styles.label}>Email</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Password</ThemedText>
              <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    returnKeyType="done"
                />
              </View>
            </View>

            {/* Fejlbesked (Rød tekst) */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Glemt Password Link */}
            <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
                disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Glemt Password?</Text>
            </TouchableOpacity>

            {/* Login Knap */}
            <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
            >
              {loading ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Opret Konto Link */}
            <View style={styles.registerRow}>
              {/* HER VAR FEJLEN: Vi bruger nu ThemedText, så den bliver hvid i Dark Mode */}
              <ThemedText style={styles.registerPrompt}>Har du ikke en konto?</ThemedText>

              <TouchableOpacity onPress={goToRegister} disabled={loading}>
                <Text style={styles.registerText}>Opret konto</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </ThemedView>
  );
};

// ---------------------------------------------------------
// STYLES
// VIGTIGT: Fjernet hardcodede farver (fx "color: #000" og "backgroundColor: #fff")
// fra de steder, hvor vi bruger Themed-komponenter.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff", <--- SLETTET (ThemedView styrer det nu)
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  welcomeText: {
    // fontSize og alignment beholder vi her.
    // Farven styres af ThemedText.
    textAlign: "center",
    marginBottom: 40,
    // color: "#000", <--- SLETTET
    ...Platform.select({
      ios: { fontFamily: "System", fontWeight: "700" },
      android: { fontFamily: "sans-serif-medium", fontWeight: "700" },
      default: {},
    }),
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    // color: "#333", <--- SLETTET
    ...Platform.select({
      ios: { fontFamily: "System", fontWeight: "600" },
      android: { fontFamily: "sans-serif-medium", fontWeight: "600" },
      default: {},
    }),
  },
  inputWrapper: {
    height: 50,
    backgroundColor: "#f5f5f5", // beholder den lysegrå-boks til input (ser fint ud i begge modes)
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 16,
    color: "#333", // Teksten inde i inputtet forbliver mørkegrå
    padding: 0,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
      default: {},
    }),
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#1e88e5", // Blå farve er fin i både lys og mørk
    fontWeight: "500",
    ...Platform.select({
      ios: { fontFamily: "System", fontWeight: "600" },
      android: { fontFamily: "sans-serif-medium", fontWeight: "600" },
      default: {},
    }),
  },
  loginButton: {
    height: 50,
    backgroundColor: "#1e88e5",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
    boxShadow: "none",
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    ...Platform.select({
      ios: { fontFamily: "System", fontWeight: "700" },
      android: { fontFamily: "sans-serif-medium", fontWeight: "700" },
      default: {},
    }),
  },
  errorText: {
    color: "#d32f2f",
    marginBottom: 12,
    fontSize: 14,
  },
  registerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  registerPrompt: {
    fontSize: 14,
    // color: "#333", <--- SLETTET (ThemedText styrer det nu)
  },
  registerText: {
    fontSize: 14,
    color: "#1e88e5",
    fontWeight: "600",
  },
  logo: {
    width: 300,
    height: 200,
    alignSelf: "center",
    marginTop: -100,
  },
});

export default LoginScreen;