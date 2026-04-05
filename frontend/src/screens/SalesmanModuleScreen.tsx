import { useEffect, useMemo, useState } from "react";
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

import { api } from "../lib/api";
import type { Bill, DiscountSlab, LoginResponse, Product, SalesmanCatalogResponse } from "../types";
import { AppShell, ModuleTabs, PrimaryButton, StatusChip, SurfaceCard, roleThemes } from "../components/ui";

const tabs = [
  { key: "new", label: "New Parcha" },
  { key: "history", label: "Old Parche" },
  { key: "profile", label: "Profile" },
];

function calculateTotal(product: Product, quantity: number) {
  if (product.bulk_offer_enabled && product.bulk_offer_units && product.bulk_offer_price) {
    const bundles = Math.floor(quantity / product.bulk_offer_units);
    const remainder = quantity % product.bulk_offer_units;
    return bundles * product.bulk_offer_price + remainder * product.price;
  }
  return quantity * product.price;
}

export function SalesmanModuleScreen({ session, onSignOut }: { session: LoginResponse; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState("new");
  const [catalog, setCatalog] = useState<SalesmanCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [manualDiscount, setManualDiscount] = useState("0");
  const [selectedSlabId, setSelectedSlabId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [location, setLocation] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [history, setHistory] = useState<Bill[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getSalesmanCatalog(session.user.id);
      setCatalog(data);
      setHistory(data.history);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const items = await api.getSalesmanBills(session.user.id, historyFilter);
      setHistory(items);
    }, 250);
    return () => clearTimeout(timeout);
  }, [historyFilter, session.user.id]);

  const selectedSlab = useMemo(
    () => catalog?.discount_slabs.find((item) => item.id === selectedSlabId) ?? null,
    [catalog?.discount_slabs, selectedSlabId]
  );

  const selectedProducts = useMemo(
    () => (catalog?.products || []).filter((product) => (quantities[product.id] || 0) > 0),
    [catalog?.products, quantities]
  );

  const subtotal = selectedProducts.reduce((sum, product) => sum + calculateTotal(product, quantities[product.id] || 0), 0);
  const manualDiscountValue = Number(manualDiscount || 0);
  const total = Math.max(subtotal - manualDiscountValue - (selectedSlab?.amount || 0), 0);

  const updateQuantity = (productId: string, direction: "inc" | "dec") => {
    setQuantities((current) => {
      const value = current[productId] || 0;
      const nextValue = direction === "inc" ? value + 1 : Math.max(value - 1, 0);
      return { ...current, [productId]: nextValue };
    });
  };

  const submitBill = async () => {
    if (!shopName.trim() || !location.trim() || selectedProducts.length === 0) {
      setMessage("Add shop name, location, and at least one product.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createBill({
        salesman_id: session.user.id,
        salesman_name: session.user.name,
        shop_name: shopName.trim(),
        location: location.trim(),
        items: selectedProducts.map((item) => ({ product_id: item.id, quantity: quantities[item.id] || 0 })),
        manual_discount: manualDiscountValue,
        discount_slab_id: selectedSlabId,
      });
      setMessage("Parcha saved successfully.");
      setQuantities({});
      setManualDiscount("0");
      setSelectedSlabId(null);
      setShopName("");
      setLocation("");
      setActiveTab("history");
      await loadCatalog();
    } finally {
      setSubmitting(false);
    }
  };

  const renderNewParcha = () => (
    <>
      <SurfaceCard delay={60}>
        <Text style={styles.sectionTitle}>Shop details</Text>
        <TextInput placeholder="Shop name" placeholderTextColor="#94A3B8" style={styles.input} value={shopName} onChangeText={setShopName} />
        <TextInput placeholder="Location" placeholderTextColor="#94A3B8" style={styles.input} value={location} onChangeText={setLocation} />
      </SurfaceCard>

      <SurfaceCard delay={90}>
        <Text style={styles.sectionTitle}>Product pricing</Text>
        {(catalog?.products || []).map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productTextWrap}>
              <Text style={styles.productTitle}>{product.name}</Text>
              <Text style={styles.productMeta}>₹{product.price} • {product.category}</Text>
              {product.bulk_offer_enabled ? (
                <Text style={styles.offerText}>Bulk: {product.bulk_offer_units} for ₹{product.bulk_offer_price}</Text>
              ) : null}
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => updateQuantity(product.id, "dec")} style={styles.stepperButton}><Text style={styles.stepperLabel}>−</Text></Pressable>
              <Text style={styles.stepperValue}>{quantities[product.id] || 0}</Text>
              <Pressable onPress={() => updateQuantity(product.id, "inc")} style={styles.stepperButton}><Text style={styles.stepperLabel}>+</Text></Pressable>
            </View>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard delay={120}>
        <Text style={styles.sectionTitle}>Discount controls</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={setManualDiscount}
          placeholder="Manual discount amount"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={manualDiscount}
        />

        <Pressable onPress={() => setDropdownOpen((value) => !value)} style={styles.dropdownButton}>
          <View>
            <Text style={styles.dropdownLabel}>Automatic discount slab</Text>
            <Text style={styles.dropdownValue}>{selectedSlab ? `${selectedSlab.label} • ₹${selectedSlab.amount}` : "Select a slab"}</Text>
          </View>
          <Text style={styles.dropdownCaret}>{dropdownOpen ? "▲" : "▼"}</Text>
        </Pressable>

        {dropdownOpen ? (
          <View style={styles.dropdownMenu}>
            {(catalog?.discount_slabs || []).map((slab: DiscountSlab) => (
              <Pressable
                key={slab.id}
                onPress={() => {
                  setSelectedSlabId(slab.id);
                  setDropdownOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.productTitle}>{slab.label}</Text>
                <Text style={styles.productMeta}>₹{slab.amount} • approved by {slab.authorized_by}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard delay={150}>
        <Text style={styles.sectionTitle}>Parcha summary</Text>
        <Text style={styles.summaryLine}>Items total: ₹{subtotal.toFixed(0)}</Text>
        <Text style={styles.summaryLine}>Manual discount: ₹{manualDiscountValue.toFixed(0)}</Text>
        <Text style={styles.summaryLine}>Automatic discount: ₹{(selectedSlab?.amount || 0).toFixed(0)}</Text>
        {selectedSlab ? <Text style={styles.summaryMeta}>Authorized by {selectedSlab.authorized_by}</Text> : null}
        <Text style={styles.summaryTotal}>Net payable ₹{total.toFixed(0)}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <PrimaryButton disabled={submitting} label={submitting ? "Saving..." : "Save parcha"} onPress={submitBill} role="salesman" />
      </SurfaceCard>
    </>
  );

  const renderHistory = () => (
    <>
      <SurfaceCard delay={60}>
        <Text style={styles.sectionTitle}>Filter by location / shop name</Text>
        <TextInput placeholder="Search shop" placeholderTextColor="#94A3B8" style={styles.input} value={historyFilter} onChangeText={setHistoryFilter} />
      </SurfaceCard>
      {history.map((bill) => (
        <SurfaceCard key={bill.id} delay={90}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.productTitle}>{bill.shop_name}</Text>
              <Text style={styles.productMeta}>{bill.location}</Text>
            </View>
            <StatusChip label={`₹${bill.total}`} tone="warning" />
          </View>
          <Text style={styles.productMeta}>{new Date(bill.created_at).toLocaleDateString()}</Text>
          {bill.items.map((item) => (
            <Text key={`${bill.id}-${item.product_id}`} style={styles.historyLine}>{item.product_name} × {item.quantity}</Text>
          ))}
        </SurfaceCard>
      ))}
    </>
  );

  const renderProfile = () => (
    <SurfaceCard delay={60}>
      <Text style={styles.sectionTitle}>Field profile</Text>
      <Text style={styles.profileLine}>Name: {session.user.name}</Text>
      <Text style={styles.profileLine}>Territory: {session.user.territory}</Text>
      <Text style={styles.profileLine}>Email: {session.user.email}</Text>
      <Text style={styles.profileLine}>Recent parche count: {history.length}</Text>
    </SurfaceCard>
  );

  return (
    <AppShell role="salesman" title={`Hi ${session.user.name.split(" ")[0]}`} subtitle="Create fresh parchas fast, apply the right discount, and pull old bills instantly." onSignOut={onSignOut}>
      <ModuleTabs active={activeTab} onChange={setActiveTab} role="salesman" tabs={tabs} />
      {loading || !catalog ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={roleThemes.salesman.primary} /></View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === "new" && renderNewParcha()}
            {activeTab === "history" && renderHistory()}
            {activeTab === "profile" && renderProfile()}
            <View style={styles.bottomSpace} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  sectionTitle: { fontSize: 21, fontWeight: "800", color: "#111827", marginBottom: 16 },
  input: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#0F172A",
    marginBottom: 12,
  },
  productCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 18 },
  productTextWrap: { flex: 1 },
  productTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  productMeta: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#64748B" },
  offerText: { marginTop: 6, fontSize: 13, color: "#FF8A28", fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#FFF6EE", alignItems: "center", justifyContent: "center" },
  stepperLabel: { fontSize: 24, fontWeight: "700", color: "#6B3A08" },
  stepperValue: { minWidth: 22, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#111827" },
  dropdownButton: { minHeight: 56, borderRadius: 18, backgroundColor: "#FFF7ED", paddingHorizontal: 16, justifyContent: "space-between", flexDirection: "row", alignItems: "center" },
  dropdownLabel: { fontSize: 12, fontWeight: "700", color: "#9A3412", marginBottom: 4 },
  dropdownValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dropdownCaret: { fontSize: 16, fontWeight: "800", color: "#9A3412" },
  dropdownMenu: { marginTop: 10, gap: 10 },
  dropdownItem: { borderRadius: 18, padding: 14, backgroundColor: "#F8FAFC" },
  summaryLine: { fontSize: 15, color: "#334155", marginBottom: 8 },
  summaryMeta: { fontSize: 13, color: "#EA580C", marginBottom: 12, fontWeight: "700" },
  summaryTotal: { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 14 },
  message: { fontSize: 14, color: "#166534", marginBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 },
  historyLine: { fontSize: 14, color: "#334155", marginTop: 6 },
  profileLine: { fontSize: 15, color: "#334155", marginBottom: 10 },
  bottomSpace: { height: 40 },
});