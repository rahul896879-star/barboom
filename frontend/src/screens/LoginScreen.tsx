import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../lib/api";
import type { LoginResponse } from "../types";
import { roleThemes, SurfaceCard } from "../components/ui";

const demoUsers = [
  { label: "Admin", email: "admin@parcha.app", password: "demo123", role: "admin" as const },
  { label: "Staff", email: "staff@parcha.app", password: "demo123", role: "staff" as const },
  { label: "Salesman", email: "sales@parcha.app", password: "demo123", role: "salesman" as const },
];

export function LoginScreen({
  errorMessage,
  onLoginSuccess,
  onLoginError,
}: {
  errorMessage: string;
  onLoginSuccess: (session: LoginResponse) => void;
  onLoginError: (message: string) => void;
}) {
  const [email, setEmail] = useState(demoUsers[0].email);
  const [password, setPassword] = useState(demoUsers[0].password);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      onLoginError("");
      const session = await api.login(email.trim(), password);
      onLoginSuccess(session);
    } catch (error) {
      onLoginError(error instanceof Error ? error.message : "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>ROLE-BASED BILLING APP</Text>
          <Text style={styles.title}>Login and jump straight to the right dashboard.</Text>
          <Text style={styles.subtitle}>
            Material 3-inspired role routing with Admin, Staff, and Salesman experiences.
          </Text>

          <SurfaceCard style={styles.formCard} delay={80}>
            <Text style={styles.sectionTitle}>Demo access</Text>
            <View style={styles.rolePills}>
              {demoUsers.map((user) => (
                <Pressable
                  key={user.role}
                  onPress={() => {
                    setEmail(user.email);
                    setPassword(user.password);
                  }}
                  style={[styles.rolePill, { backgroundColor: roleThemes[user.role].surface }]}
                >
                  <Text style={[styles.rolePillLabel, { color: roleThemes[user.role].primary }]}>{user.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable disabled={loading} onPress={submit} style={[styles.submitButton, loading && styles.submitButtonDisabled]}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitLabel}>Continue</Text>}
            </Pressable>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 28 },
  eyebrow: { color: "#2B69FF", fontSize: 12, fontWeight: "800", letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: "800", color: "#111827", lineHeight: 38, marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#4B5563", lineHeight: 24, marginBottom: 28 },
  formCard: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 16 },
  rolePills: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  rolePill: { minHeight: 44, borderRadius: 18, paddingHorizontal: 14, justifyContent: "center" },
  rolePillLabel: { fontSize: 14, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8, marginTop: 4 },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 16,
  },
  errorText: { color: "#B91C1C", fontSize: 14, marginBottom: 14 },
  submitButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});