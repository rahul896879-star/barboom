import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import type { Role } from "../types";

export const roleThemes = {
  admin: { primary: "#2B69FF", surface: "#F2F6FF", accent: "#DCE8FF", text: "#173160" },
  staff: { primary: "#239B5A", surface: "#F0FFF6", accent: "#D7F8E5", text: "#13502F" },
  salesman: { primary: "#FF8A28", surface: "#FFF6EE", accent: "#FFE2C2", text: "#6B3A08" },
} as const;

export function AppShell({
  role,
  title,
  subtitle,
  onSignOut,
  children,
}: {
  role: Role;
  title: string;
  subtitle: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const theme = roleThemes[role];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.hero, { backgroundColor: theme.surface }]}> 
          <View style={styles.heroTextWrap}>
            <Text style={[styles.kicker, { color: theme.primary }]}>{role.toUpperCase()} PANEL</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onSignOut} style={styles.signOutButton}>
            <MaterialIcons name="logout" size={20} color="#172033" />
          </Pressable>
        </View>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function SurfaceCard({ children, style, delay = 0 }: { children: ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  return (
    <Animated.View entering={FadeInUp.duration(450).delay(delay)} style={[styles.card, style]}>
      {children}
    </Animated.View>
  );
}

export function ModuleTabs({
  tabs,
  active,
  onChange,
  role,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
  role: Role;
}) {
  const theme = roleThemes[role];
  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tabButton, { backgroundColor: isActive ? theme.primary : "#FFFFFF" }]}
          >
            <Text style={[styles.tabLabel, { color: isActive ? "#FFFFFF" : "#485366" }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  role,
  compact = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  role: Role;
  compact?: boolean;
  disabled?: boolean;
}) {
  const theme = roleThemes[role];
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, compact && styles.compactButton, { backgroundColor: disabled ? "#CBD5E1" : theme.primary }]}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" | "danger" }) {
  const toneMap = {
    success: { bg: "#DCFCE7", fg: "#166534" },
    warning: { bg: "#FEF3C7", fg: "#92400E" },
    neutral: { bg: "#E2E8F0", fg: "#334155" },
    danger: { bg: "#FEE2E2", fg: "#991B1B" },
  } as const;
  return (
    <View style={[styles.statusChip, { backgroundColor: toneMap[tone].bg }]}> 
      <Text style={[styles.statusChipLabel, { color: toneMap[tone].fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F8FC" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  hero: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroTextWrap: { flex: 1, paddingRight: 12 },
  kicker: { fontSize: 12, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "800", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 15, lineHeight: 22, color: "#4B5563" },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  tabRow: { flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  tabButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: "center" },
  tabLabel: { fontSize: 14, fontWeight: "700" },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  compactButton: { minHeight: 44, paddingHorizontal: 14 },
  primaryButtonLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  statusChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusChipLabel: { fontSize: 12, fontWeight: "700" },
});