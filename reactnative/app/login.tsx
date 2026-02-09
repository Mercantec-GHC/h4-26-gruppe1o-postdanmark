import { useRouter } from "expo-router";
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

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
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
      // Error Message - Handling: Vi prøver at finde en pæn besked i svaret, ellers fallback til status
      // TJEK OM SERVEREN SIGER "NEJ" (Fejl 400, 401, 500 osv.)
      if (!res.ok) {

        // 1. Hent svaret som rå tekst først (Backup-løsning)
        // Hvis serveren crasher helt, sender den måske bare tekst og ikke JSON.
        const text = await res.text();
        let errorMessage = text;

        try {
          // 2. Prøv at pakke gaven ud (Er det JSON format?)
          const data = JSON.parse(text);

          // CASE A: Dørmand 1 (Vores egen kode)
          // Hvis backend siger: "Forkert password", ligger det her.
          if (data.message) {
            errorMessage = data.message;
          }

          // CASE B: Dørmand 2 (Systemets automatiske tjek)
          // Hvis du skriver "dlkbvmd" i stedet for en legit email.
          // Systemet sender en liste af fejl. Vi tager bare den allerførste fejl, vi kan finde.
          else if (data.errors) {
            // Find navnet på den første fejl (f.eks. "Email")
            const firstErrorKey = Object.keys(data.errors)[0];

            if (firstErrorKey) {
              // Hent selve beskeden (f.eks. "Ugyldig email-adresse")
              errorMessage = data.errors[firstErrorKey][0];
            }
          }
          // CASE C: Sidste udvej (Generel titel)
          // Hvis intet andet findes, tager vi titlen (f.eks. "One or more errors occurred").
          else if (data.title) {
            errorMessage = data.title;
          }
        } catch (e) {
          // 3. Hvis pakken IKKE kunne åbnes (ikke JSON), så gør vi ingenting.
          // Vi beholder bare den rå tekst, vi hentede i trin 1.
        }
        // 4. Stop op og kast fejlen videre til brugeren (Det røde tekstfelt)
        throw new Error(errorMessage || `Login failed (${res.status})`);
      }

      
      
      //Gør brug af tokenStorage til at gemme tokenet
      const data = await res.json();
      if (data.token) {
        await saveToken(data.token);
      }
        playSoundEffect(require("../sound-effects/honk-honk.wav"));
      router.replace("/(tabs)/routes");
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Image
            source={require('../assets/images/PostDanmark.png')}
            style={styles.logo}
        />

        {/* Welcome Header */}
        <Text style={styles.welcomeText}>Velkommen!</Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
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
          <Text style={styles.label}>Password</Text>
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

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Glemt Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
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

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Har du ikke en konto?</Text>
          <TouchableOpacity onPress={goToRegister} disabled={loading}>
            <Text style={styles.registerText}>Opret konto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 40,
    ...Platform.select({
      ios: {
        fontFamily: "System",
        fontWeight: "700",
      },
      android: {
        fontFamily: "sans-serif-medium",
        fontWeight: "700",
      },
      default: {},
    }),
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        fontFamily: "System",
        fontWeight: "600",
      },
      android: {
        fontFamily: "sans-serif-medium",
        fontWeight: "600",
      },
      default: {},
    }),
  },
  inputWrapper: {
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 16,
    color: "#333",
    padding: 0,
    ...Platform.select({
      ios: {
        fontFamily: "System",
      },
      android: {
        fontFamily: "sans-serif",
      },
      default: {},
    }),
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#1e88e5",
    fontWeight: "500",
    ...Platform.select({
      ios: {
        fontFamily: "System",
        fontWeight: "600",
      },
      android: {
        fontFamily: "sans-serif-medium",
        fontWeight: "600",
      },
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
      ios: {
        fontFamily: "System",
        fontWeight: "700",
      },
      android: {
        fontFamily: "sans-serif-medium",
        fontWeight: "700",
      },
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
    color: "#333",
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
