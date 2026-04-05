import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../lib/api";
import type { LoginResponse, StaffDashboardResponse } from "../types";
import { AppShell, ModuleTabs, PrimaryButton, StatusChip, SurfaceCard, roleThemes } from "../components/ui";

const tabs = [
  { key: "delivery", label: "Delivery" },
  { key: "collection", label: "Collection" },
  { key: "team", label: "Salesmen" },
];

export function StaffModuleScreen({ session, onSignOut }: { session: LoginResponse; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState("delivery");
  const [dashboard, setDashboard] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseDrafts, setExpenseDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      setDashboard(await api.getStaffDashboard());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (deliveryId: string) => {
    const updated = await api.advanceDeliveryStatus(deliveryId);
    setDashboard((current) => current ? { ...current, deliveries: current.deliveries.map((item) => (item.id === deliveryId ? updated : item)) } : current);
  };

  const saveExpense = async (deliveryId: string) => {
    const amount = Number(expenseDrafts[deliveryId] || 0);
    const updated = await api.updateDeliveryExpense(deliveryId, amount);
    setDashboard((current) => current ? { ...current, deliveries: current.deliveries.map((item) => (item.id === deliveryId ? updated : item)) } : current);
  };

  const acceptCollection = async (collectionId: string) => {
    const updated = await api.acceptCollection(collectionId);
    setDashboard((current) => current ? { ...current, collections: current.collections.map((item) => (item.id === collectionId ? updated : item)) } : current);
  };

  const statusTone = (status: string) => (status === "Delivered" || status === "Accepted" ? "success" : status === "Picked up" ? "warning" : "neutral");

  return (
    <AppShell role="staff" title={`Hi ${session.user.name.split(" ")[0]}`} subtitle="Coordinate deliveries, expenses, and collections without losing the field picture." onSignOut={onSignOut}>
      <ModuleTabs active={activeTab} onChange={setActiveTab} role="staff" tabs={tabs} />
      {loading || !dashboard ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={roleThemes.staff.primary} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {activeTab === "delivery" && (
            <>
              <SurfaceCard delay={60}>
                <Text style={styles.bigNumber}>{dashboard.delivery_count}</Text>
                <Text style={styles.bigCaption}>salesmen need delivery attention today</Text>
              </SurfaceCard>
              {dashboard.deliveries.map((delivery) => (
                <SurfaceCard key={delivery.id} delay={90}>
                  <View style={styles.rowBetween}>
                    <View>
                      <Text style={styles.title}>{delivery.salesman_name}</Text>
                      <Text style={styles.meta}>{delivery.warehouse}</Text>
                    </View>
                    <StatusChip label={delivery.status} tone={statusTone(delivery.status)} />
                  </View>
                  {delivery.items.map((item) => (
                    <Text key={`${delivery.id}-${item.product_name}`} style={styles.listText}>• {item.product_name} × {item.quantity}</Text>
                  ))}
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) => setExpenseDrafts((current) => ({ ...current, [delivery.id]: value }))}
                    placeholder="Add fuel / travel cost"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    value={expenseDrafts[delivery.id] ?? String(delivery.expense || "")}
                  />
                  <View style={styles.buttonRow}>
                    <PrimaryButton compact label="Save cost" onPress={() => saveExpense(delivery.id)} role="staff" />
                    <PrimaryButton compact disabled={delivery.status === "Delivered"} label={delivery.status === "Pending" ? "Mark Picked up" : "Mark Delivered"} onPress={() => updateStatus(delivery.id)} role="staff" />
                  </View>
                </SurfaceCard>
              ))}
            </>
          )}

          {activeTab === "collection" && dashboard.collections.map((item) => (
            <SurfaceCard key={item.id} delay={80}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.title}>{item.salesman_name}</Text>
                  <Text style={styles.meta}>{item.shop_name}</Text>
                </View>
                <Text style={styles.amount}>₹{item.amount}</Text>
              </View>
              <View style={styles.rowBetween}>
                <StatusChip label={item.status} tone={statusTone(item.status)} />
                <PrimaryButton compact disabled={item.status === "Accepted"} label="Amount Accepted" onPress={() => acceptCollection(item.id)} role="staff" />
              </View>
            </SurfaceCard>
          ))}

          {activeTab === "team" && dashboard.salesmen.map((member) => (
            <SurfaceCard key={member.id} delay={80}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.title}>{member.name}</Text>
                  <Text style={styles.meta}>{member.email}</Text>
                  <Text style={styles.meta}>{member.territory}</Text>
                </View>
                <StatusChip label={member.status} tone={member.status === "active" ? "success" : "neutral"} />
              </View>
            </SurfaceCard>
          ))}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  bigNumber: { fontSize: 44, fontWeight: "800", color: "#111827", marginBottom: 8 },
  bigCaption: { fontSize: 16, color: "#475569", lineHeight: 22 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  meta: { fontSize: 13, color: "#64748B", marginTop: 4 },
  listText: { fontSize: 14, color: "#334155", marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    marginTop: 14,
    marginBottom: 14,
  },
  buttonRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  amount: { fontSize: 22, fontWeight: "800", color: "#111827" },
  bottomSpace: { height: 40 },
});