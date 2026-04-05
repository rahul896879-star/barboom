import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../lib/api";
import type { AdminDashboardResponse, LoginResponse, Product, Promotion, UserProfile } from "../types";
import { AppShell, ModuleTabs, PrimaryButton, roleThemes, StatusChip, SurfaceCard } from "../components/ui";

const tabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "team", label: "Team" },
  { key: "inventory", label: "Inventory" },
  { key: "offers", label: "Offers" },
];

export function AdminDashboardScreen({ session, onSignOut }: { session: LoginResponse; onSignOut: () => void }) {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = roleThemes.admin;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, teamData, productData, promotionData] = await Promise.all([
        api.getAdminDashboard(period),
        api.listUsers(),
        api.listProducts(),
        api.listPromotions(),
      ]);
      setDashboard(dashboardData);
      setTeam(teamData);
      setProducts(productData);
      setPromotions(promotionData);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleStatus = async (userId: string) => {
    const updated = await api.toggleUserStatus(userId);
    setTeam((current) => current.map((item) => (item.id === userId ? updated : item)));
  };

  const maxRevenue = useMemo(() => Math.max(...(dashboard?.revenue.map((item) => item.value) || [1])), [dashboard]);

  const renderDashboard = () => {
    if (!dashboard) return null;
    return (
      <>
        <SurfaceCard delay={60}>
          <View style={styles.segmentRow}>
            {(["daily", "monthly"] as const).map((value) => (
              <Pressable key={value} onPress={() => setPeriod(value)} style={[styles.segmentButton, { backgroundColor: period === value ? theme.primary : theme.surface }]}>
                <Text style={[styles.segmentLabel, { color: period === value ? "#FFFFFF" : theme.text }]}>{value.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Revenue performance</Text>
          <View style={styles.metricGrid}>
            {dashboard.metrics.map((metric) => (
              <View key={metric.label} style={[styles.metricCard, { backgroundColor: theme.surface }]}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricCaption}>{metric.caption}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartRow}>
            {dashboard.revenue.map((point) => (
              <View key={point.label} style={styles.chartColumn}>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { backgroundColor: theme.primary, height: `${(point.value / maxRevenue) * 100}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard delay={100}>
          <Text style={styles.sectionTitle}>Quick control room</Text>
          {dashboard.team_preview.map((member) => (
            <View key={member.id} style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>{member.name}</Text>
                <Text style={styles.rowMeta}>{member.role} • {member.territory}</Text>
              </View>
              <StatusChip label={member.status} tone={member.status === "active" ? "success" : "neutral"} />
            </View>
          ))}
        </SurfaceCard>
      </>
    );
  };

  const renderTeam = () => (
    <SurfaceCard delay={80}>
      <Text style={styles.sectionTitle}>Staff & salesman management</Text>
      {team.map((member) => (
        <View key={member.id} style={styles.rowItem}>
          <View style={styles.rowTextWrap}>
            <Text style={styles.rowTitle}>{member.name}</Text>
            <Text style={styles.rowMeta}>{member.role} • {member.email}</Text>
          </View>
          <View style={styles.rowActions}>
            <StatusChip label={member.status} tone={member.status === "active" ? "success" : "neutral"} />
            {member.role !== "admin" ? (
              <PrimaryButton compact label={member.status === "active" ? "Deactivate" : "Activate"} onPress={() => toggleStatus(member.id)} role="admin" />
            ) : null}
          </View>
        </View>
      ))}
    </SurfaceCard>
  );

  const renderInventory = () => (
    <SurfaceCard delay={80}>
      <Text style={styles.sectionTitle}>Warehouse stock view</Text>
      {products.map((product) => {
        const ratio = Math.min(product.stock / 70, 1);
        return (
          <View key={product.id} style={styles.inventoryBlock}>
            <View style={styles.rowItem}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{product.name}</Text>
                <Text style={styles.rowMeta}>{product.warehouse} • ₹{product.price}</Text>
              </View>
              <StatusChip label={`${product.stock} left`} tone={product.stock <= 15 ? "warning" : "success"} />
            </View>
            <View style={styles.stockTrack}>
              <View style={[styles.stockFill, { width: `${ratio * 100}%`, backgroundColor: product.stock <= 15 ? "#F59E0B" : theme.primary }]} />
            </View>
            {product.bulk_offer_enabled ? <Text style={styles.inventoryOffer}>Bulk offer: {product.bulk_offer_units} for ₹{product.bulk_offer_price}</Text> : null}
          </View>
        );
      })}
    </SurfaceCard>
  );

  const renderOffers = () => (
    <>
      <SurfaceCard delay={80}>
        <Text style={styles.sectionTitle}>Festival coupons</Text>
        {promotions.map((promotion) => (
          <View key={promotion.id} style={[styles.promoCard, { backgroundColor: theme.surface }]}> 
            <View>
              <Text style={styles.rowTitle}>{promotion.code}</Text>
              <Text style={styles.rowMeta}>{promotion.title} • expires {promotion.expires_at}</Text>
            </View>
            <StatusChip label={`${promotion.discount_percent}% off`} tone="warning" />
          </View>
        ))}
      </SurfaceCard>
      <SurfaceCard delay={120}>
        <Text style={styles.sectionTitle}>Notification center</Text>
        {dashboard?.notifications.map((note) => (
          <View key={note.id} style={styles.notificationCard}>
            <Text style={styles.rowTitle}>{note.title}</Text>
            <Text style={styles.rowMeta}>{note.message}</Text>
          </View>
        ))}
      </SurfaceCard>
    </>
  );

  return (
    <AppShell role="admin" title={`Hi ${session.user.name.split(" ")[0]}`} subtitle="Revenue, people, products, and alerts in one controller view." onSignOut={onSignOut}>
      <ModuleTabs active={activeTab} onChange={setActiveTab} role="admin" tabs={tabs} />
      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />} showsVerticalScrollIndicator={false}>
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "team" && renderTeam()}
          {activeTab === "inventory" && renderInventory()}
          {activeTab === "offers" && renderOffers()}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  segmentRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  segmentButton: { minHeight: 42, borderRadius: 16, paddingHorizontal: 16, justifyContent: "center" },
  segmentLabel: { fontSize: 13, fontWeight: "800" },
  sectionTitle: { fontSize: 21, fontWeight: "800", color: "#111827", marginBottom: 16 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  metricCard: { width: "47%", borderRadius: 20, padding: 14 },
  metricLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8 },
  metricValue: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  metricCaption: { fontSize: 12, color: "#475569", lineHeight: 18 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 170, gap: 8 },
  chartColumn: { flex: 1, alignItems: "center" },
  chartTrack: { width: "100%", height: 140, justifyContent: "flex-end", backgroundColor: "#EEF2FF", borderRadius: 20, padding: 6 },
  chartBar: { width: "100%", borderRadius: 14, minHeight: 12 },
  chartLabel: { marginTop: 8, fontSize: 12, color: "#64748B", fontWeight: "700" },
  rowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  rowMeta: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#64748B" },
  rowActions: { alignItems: "flex-end", gap: 10 },
  inventoryBlock: { marginBottom: 18 },
  stockTrack: { height: 10, borderRadius: 999, backgroundColor: "#E2E8F0", overflow: "hidden", marginTop: 10 },
  stockFill: { height: "100%", borderRadius: 999 },
  inventoryOffer: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#2B69FF" },
  promoCard: { borderRadius: 20, padding: 14, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  notificationCard: { borderRadius: 18, padding: 14, backgroundColor: "#F8FAFC", marginBottom: 10 },
  bottomSpace: { height: 40 },
});