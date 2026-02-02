import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as authService from "@/services/authService";
import { ApiError } from "@/services/authService";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validerer felterne
    if (!email || !password) {
      Alert.alert("Fejl", "Udfyld venligst alle felter");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login({
        email,
        password,
      });

      // Renser felterne
      setEmail("");
      setPassword("");

      Alert.alert(
        "Succes",
        `${response.message}\nVelkommen ${response.user.name}!`,
        [{ text: "OK" }]
      );

      console.log("Token:", response.token);
      console.log("User:", response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert("Login mislykkedes", error.message);
      } else {
        Alert.alert("Fejl", "Der opstod en netværksfejl. Prøv igen.");
      }
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.content}>
          <ThemedView style={styles.iconContainer}>
            <MaterialIcons name="login" size={80} color="#007AFF" />
          </ThemedView>
          <ThemedText type="title" style={styles.title}>
            Log ind
          </ThemedText>

          <ThemedView style={styles.form}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Indtast din email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <ThemedText style={styles.label}>Adgangskode</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Indtast din adgangskode"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Log ind</ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    marginBottom: 30,
    textAlign: "center",
  },
  form: {
    gap: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
