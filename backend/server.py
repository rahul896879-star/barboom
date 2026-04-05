from datetime import datetime, timedelta, timezone
import logging
import os
from pathlib import Path
from typing import List, Literal, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Parcha Control API")
api_router = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


Role = Literal["admin", "staff", "salesman"]
DeliveryStatus = Literal["Pending", "Picked up", "Delivered"]
CollectionStatus = Literal["Pending", "Accepted"]


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    status: Literal["active", "inactive"]
    territory: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserProfile


class DashboardMetric(BaseModel):
    label: str
    value: str
    caption: str


class RevenuePoint(BaseModel):
    label: str
    value: float


class Product(BaseModel):
    id: str
    name: str
    sku: str
    category: str
    price: float
    bulk_offer_enabled: bool
    bulk_offer_units: Optional[int] = None
    bulk_offer_price: Optional[float] = None
    stock: int
    warehouse: str


class Promotion(BaseModel):
    id: str
    code: str
    title: str
    festival: str
    discount_percent: int
    expires_at: str
    status: Literal["active", "expired"]


class NotificationItem(BaseModel):
    id: str
    title: str
    message: str
    priority: Literal["low", "medium", "high"]
    created_at: str


class DiscountSlab(BaseModel):
    id: str
    label: str
    amount: float
    authorized_by: str


class DeliveryLine(BaseModel):
    product_name: str
    quantity: int


class Delivery(BaseModel):
    id: str
    salesman_id: str
    salesman_name: str
    warehouse: str
    status: DeliveryStatus
    items: List[DeliveryLine]
    expense: float


class CollectionItem(BaseModel):
    id: str
    salesman_name: str
    shop_name: str
    amount: float
    status: CollectionStatus


class BillLine(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class Bill(BaseModel):
    id: str
    salesman_id: str
    salesman_name: str
    shop_name: str
    location: str
    items: List[BillLine]
    subtotal: float
    manual_discount: float
    automatic_discount: float
    automatic_discount_label: Optional[str] = None
    authorized_by: Optional[str] = None
    total: float
    created_at: str


class AdminDashboardResponse(BaseModel):
    metrics: List[DashboardMetric]
    revenue: List[RevenuePoint]
    team_preview: List[UserProfile]
    promotions: List[Promotion]
    inventory: List[Product]
    notifications: List[NotificationItem]


class StaffDashboardResponse(BaseModel):
    delivery_count: int
    deliveries: List[Delivery]
    collections: List[CollectionItem]
    salesmen: List[UserProfile]


class SalesmanCatalogResponse(BaseModel):
    products: List[Product]
    discount_slabs: List[DiscountSlab]
    history: List[Bill]


class UserCreate(BaseModel):
    name: str
    email: str
    role: Literal["staff", "salesman"]
    territory: str
    password: str = "demo123"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    territory: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    price: float
    bulk_offer_enabled: bool = False
    bulk_offer_units: Optional[int] = None
    bulk_offer_price: Optional[float] = None
    stock: int
    warehouse: str


class PromotionCreate(BaseModel):
    code: str
    title: str
    festival: str
    discount_percent: int
    expires_at: str


class DeliveryExpenseInput(BaseModel):
    amount: float


class BillItemInput(BaseModel):
    product_id: str
    quantity: int


class BillCreate(BaseModel):
    salesman_id: str
    salesman_name: str
    shop_name: str
    location: str
    items: List[BillItemInput]
    manual_discount: float = 0
    discount_slab_id: Optional[str] = None


def seeded_users() -> List[dict]:
    return [
        {"id": "admin-1", "name": "Amara Singh", "email": "admin@parcha.app", "password": "demo123", "role": "admin", "status": "active", "territory": "HQ"},
        {"id": "staff-1", "name": "Riya Mehta", "email": "staff@parcha.app", "password": "demo123", "role": "staff", "status": "active", "territory": "North Warehouse"},
        {"id": "staff-2", "name": "Neeraj Kumar", "email": "neeraj@parcha.app", "password": "demo123", "role": "staff", "status": "active", "territory": "South Warehouse"},
        {"id": "sales-1", "name": "Dev Malhotra", "email": "sales@parcha.app", "password": "demo123", "role": "salesman", "status": "active", "territory": "City Center"},
        {"id": "sales-2", "name": "Aisha Khan", "email": "aisha@parcha.app", "password": "demo123", "role": "salesman", "status": "active", "territory": "Market East"},
        {"id": "sales-3", "name": "Karan Joshi", "email": "karan@parcha.app", "password": "demo123", "role": "salesman", "status": "inactive", "territory": "Retail West"},
    ]


def seeded_products() -> List[dict]:
    return [
        {"id": "prod-1", "name": "Classic Oil Tin", "sku": "CL-OIL-01", "category": "Essentials", "price": 100, "bulk_offer_enabled": True, "bulk_offer_units": 6, "bulk_offer_price": 500, "stock": 42, "warehouse": "North Warehouse"},
        {"id": "prod-2", "name": "Premium Atta Bag", "sku": "ATTA-10KG", "category": "Staples", "price": 250, "bulk_offer_enabled": True, "bulk_offer_units": 3, "bulk_offer_price": 690, "stock": 18, "warehouse": "South Warehouse"},
        {"id": "prod-3", "name": "Daily Tea Jar", "sku": "TEA-500", "category": "Beverages", "price": 80, "bulk_offer_enabled": True, "bulk_offer_units": 10, "bulk_offer_price": 720, "stock": 64, "warehouse": "North Warehouse"},
        {"id": "prod-4", "name": "Spice Combo Pack", "sku": "SPICE-04", "category": "Kitchen", "price": 140, "bulk_offer_enabled": False, "bulk_offer_units": None, "bulk_offer_price": None, "stock": 11, "warehouse": "Main Warehouse"},
    ]


def seeded_promotions() -> List[dict]:
    future = (datetime.now(timezone.utc) + timedelta(days=18)).date().isoformat()
    return [
        {"id": "promo-1", "code": "DIWALI15", "title": "Festival Push", "festival": "Diwali", "discount_percent": 15, "expires_at": future, "status": "active"},
        {"id": "promo-2", "code": "HOLI8", "title": "Color Week Support", "festival": "Holi", "discount_percent": 8, "expires_at": future, "status": "active"},
    ]


def seeded_revenue() -> List[dict]:
    records: List[dict] = []
    for period, points in (("daily", [("Mon", 12400), ("Tue", 14150), ("Wed", 13680), ("Thu", 15890), ("Fri", 17220), ("Sat", 16510), ("Sun", 14900)]), ("monthly", [("Jan", 182000), ("Feb", 194500), ("Mar", 208200), ("Apr", 221300), ("May", 246800), ("Jun", 259400)])):
        for index, (label, value) in enumerate(points):
            records.append({"id": f"{period}-{index + 1}", "period": period, "label": label, "value": value, "sort_order": index})
    return records


def seeded_discount_slabs() -> List[dict]:
    return [
        {"id": "slab-1", "label": "Top Shop Support", "amount": 40, "authorized_by": "Amara Singh"},
        {"id": "slab-2", "label": "Festival Push", "amount": 75, "authorized_by": "Amara Singh"},
    ]


def seeded_deliveries() -> List[dict]:
    return [
        {"id": "delivery-1", "salesman_id": "sales-1", "salesman_name": "Dev Malhotra", "warehouse": "North Warehouse", "status": "Pending", "expense": 0, "items": [{"product_name": "Classic Oil Tin", "quantity": 12}, {"product_name": "Daily Tea Jar", "quantity": 8}]},
        {"id": "delivery-2", "salesman_id": "sales-2", "salesman_name": "Aisha Khan", "warehouse": "South Warehouse", "status": "Picked up", "expense": 220, "items": [{"product_name": "Premium Atta Bag", "quantity": 6}]},
    ]


def seeded_collections() -> List[dict]:
    return [
        {"id": "collection-1", "salesman_name": "Dev Malhotra", "shop_name": "Mohan Kirana", "amount": 3250, "status": "Pending"},
        {"id": "collection-2", "salesman_name": "Aisha Khan", "shop_name": "Lucky Stores", "amount": 4820, "status": "Pending"},
    ]


def seeded_alerts() -> List[dict]:
    return [
        {"id": "alert-1", "title": "Restock Needed", "message": "Dev Malhotra is low on Classic Oil Tin at Mohan Kirana.", "priority": "high", "created_at": now_iso()},
        {"id": "alert-2", "title": "Collection Awaiting", "message": "Pending cash from Lucky Stores needs review today.", "priority": "medium", "created_at": now_iso()},
    ]


def seeded_bills() -> List[dict]:
    return [
        {"id": "bill-1", "salesman_id": "sales-1", "salesman_name": "Dev Malhotra", "shop_name": "Mohan Kirana", "location": "Sector 7", "items": [{"product_id": "prod-1", "product_name": "Classic Oil Tin", "quantity": 6, "unit_price": 100, "line_total": 500}], "subtotal": 500, "manual_discount": 20, "automatic_discount": 40, "automatic_discount_label": "Top Shop Support", "authorized_by": "Amara Singh", "total": 440, "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
        {"id": "bill-2", "salesman_id": "sales-1", "salesman_name": "Dev Malhotra", "shop_name": "Shree Mart", "location": "Old Bazaar", "items": [{"product_id": "prod-3", "product_name": "Daily Tea Jar", "quantity": 10, "unit_price": 80, "line_total": 720}], "subtotal": 720, "manual_discount": 0, "automatic_discount": 75, "automatic_discount_label": "Festival Push", "authorized_by": "Amara Singh", "total": 645, "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
    ]


async def seed_collection(name: str, documents: List[dict]) -> None:
    if await db[name].count_documents({}) == 0:
        await db[name].insert_many([doc.copy() for doc in documents])


@app.on_event("startup")
async def startup_seed() -> None:
    await seed_collection("users", seeded_users())
    await seed_collection("products", seeded_products())
    await seed_collection("promotions", seeded_promotions())
    await seed_collection("revenue", seeded_revenue())
    await seed_collection("discount_slabs", seeded_discount_slabs())
    await seed_collection("deliveries", seeded_deliveries())
    await seed_collection("collections", seeded_collections())
    await seed_collection("alerts", seeded_alerts())
    await seed_collection("bills", seeded_bills())


async def list_users(role: Optional[str] = None) -> List[UserProfile]:
    query = {"role": role} if role else {}
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("name", 1).to_list(100)
    return [UserProfile(**user) for user in users]


def calculate_line_total(product: dict, quantity: int) -> float:
    if product.get("bulk_offer_enabled") and product.get("bulk_offer_units") and product.get("bulk_offer_price"):
        units = int(product["bulk_offer_units"])
        offer_price = float(product["bulk_offer_price"])
        bundles = quantity // units
        remainder = quantity % units
        return round((bundles * offer_price) + (remainder * float(product["price"])), 2)
    return round(quantity * float(product["price"]), 2)


async def build_admin_dashboard(period: Literal["daily", "monthly"]) -> AdminDashboardResponse:
    revenue_docs = await db.revenue.find({"period": period}, {"_id": 0}).sort("sort_order", 1).to_list(20)
    revenue = [RevenuePoint(label=item["label"], value=float(item["value"])) for item in revenue_docs]
    deliveries_pending = await db.deliveries.count_documents({"status": {"$ne": "Delivered"}})
    collections_pending = await db.collections.count_documents({"status": "Pending"})
    salesmen_active = await db.users.count_documents({"role": "salesman", "status": "active"})
    staff_active = await db.users.count_documents({"role": "staff", "status": "active"})
    total_revenue = sum(point.value for point in revenue)
    inventory = await db.products.find({}, {"_id": 0}).sort("stock", 1).to_list(6)
    promotions = await db.promotions.find({}, {"_id": 0}).sort("festival", 1).to_list(10)
    notifications = await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    team_preview = await list_users()
    metrics = [
        DashboardMetric(label="Revenue", value=f"₹{total_revenue:,.0f}", caption=f"{period.title()} trend"),
        DashboardMetric(label="Active Staff", value=str(staff_active), caption="Coordinators live today"),
        DashboardMetric(label="Active Salesmen", value=str(salesmen_active), caption="Field coverage ready"),
        DashboardMetric(label="Pending Ops", value=str(deliveries_pending + collections_pending), caption="Deliveries + collections"),
    ]
    return AdminDashboardResponse(metrics=metrics, revenue=revenue, team_preview=team_preview[:5], promotions=[Promotion(**promo) for promo in promotions], inventory=[Product(**item) for item in inventory], notifications=[NotificationItem(**item) for item in notifications])


@api_router.get("/")
async def root() -> dict:
    return {"message": "Parcha Control API ready"}


@api_router.get("/health")
async def health() -> dict:
    return {"status": "ok", "timestamp": now_iso()}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest) -> LoginResponse:
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or user.get("password") != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="This account is inactive")
    profile = UserProfile(**{key: value for key, value in user.items() if key != "password"})
    return LoginResponse(token=f"session-{uuid4()}", user=profile)


@api_router.get("/admin/dashboard", response_model=AdminDashboardResponse)
async def get_admin_dashboard(period: Literal["daily", "monthly"] = Query("daily")) -> AdminDashboardResponse:
    return await build_admin_dashboard(period)


@api_router.get("/admin/users", response_model=List[UserProfile])
async def get_admin_users(role: Optional[Literal["staff", "salesman"]] = Query(None)) -> List[UserProfile]:
    return await list_users(role)


@api_router.post("/admin/users", response_model=UserProfile)
async def create_admin_user(payload: UserCreate) -> UserProfile:
    existing = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = {"id": f"{payload.role}-{uuid4().hex[:8]}", "name": payload.name, "email": payload.email.lower(), "password": payload.password, "role": payload.role, "status": "active", "territory": payload.territory}
    await db.users.insert_one(user.copy())
    return UserProfile(**{key: value for key, value in user.items() if key != "password"})


@api_router.put("/admin/users/{user_id}", response_model=UserProfile)
async def update_admin_user(user_id: str, payload: UserUpdate) -> UserProfile:
    update_data = {key: value for key, value in payload.model_dump().items() if value is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No changes provided")
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserProfile(**user)


@api_router.patch("/admin/users/{user_id}/status", response_model=UserProfile)
async def toggle_user_status(user_id: str) -> UserProfile:
    current = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="User not found")
    next_status = "inactive" if current["status"] == "active" else "active"
    await db.users.update_one({"id": user_id}, {"$set": {"status": next_status}})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return UserProfile(**updated)


@api_router.delete("/admin/users/{user_id}")
async def delete_admin_user(user_id: str) -> dict:
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "user_id": user_id}


@api_router.get("/admin/products", response_model=List[Product])
async def get_products() -> List[Product]:
    products = await db.products.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return [Product(**product) for product in products]


@api_router.post("/admin/products", response_model=Product)
async def create_product(payload: ProductCreate) -> Product:
    product = {"id": f"prod-{uuid4().hex[:8]}", **payload.model_dump()}
    await db.products.insert_one(product.copy())
    return Product(**product)


@api_router.get("/admin/promotions", response_model=List[Promotion])
async def get_promotions() -> List[Promotion]:
    promos = await db.promotions.find({}, {"_id": 0}).sort("expires_at", 1).to_list(100)
    return [Promotion(**promo) for promo in promos]


@api_router.post("/admin/promotions", response_model=Promotion)
async def create_promotion(payload: PromotionCreate) -> Promotion:
    promotion = {"id": f"promo-{uuid4().hex[:8]}", **payload.model_dump(), "status": "active"}
    await db.promotions.insert_one(promotion.copy())
    return Promotion(**promotion)


@api_router.get("/admin/notifications", response_model=List[NotificationItem])
async def get_notifications() -> List[NotificationItem]:
    alerts = await db.alerts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [NotificationItem(**alert) for alert in alerts]


@api_router.get("/staff/dashboard", response_model=StaffDashboardResponse)
async def get_staff_dashboard() -> StaffDashboardResponse:
    deliveries = await db.deliveries.find({}, {"_id": 0}).sort("status", 1).to_list(50)
    collections = await db.collections.find({}, {"_id": 0}).sort("status", 1).to_list(50)
    salesmen = await list_users("salesman")
    return StaffDashboardResponse(delivery_count=len([item for item in deliveries if item["status"] != "Delivered"]), deliveries=[Delivery(**item) for item in deliveries], collections=[CollectionItem(**item) for item in collections], salesmen=salesmen)


@api_router.patch("/staff/deliveries/{delivery_id}/status", response_model=Delivery)
async def update_delivery_status(delivery_id: str) -> Delivery:
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    flow = {"Pending": "Picked up", "Picked up": "Delivered", "Delivered": "Delivered"}
    await db.deliveries.update_one({"id": delivery_id}, {"$set": {"status": flow[delivery["status"]]}})
    updated = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    return Delivery(**updated)


@api_router.post("/staff/deliveries/{delivery_id}/expense", response_model=Delivery)
async def update_delivery_expense(delivery_id: str, payload: DeliveryExpenseInput) -> Delivery:
    result = await db.deliveries.update_one({"id": delivery_id}, {"$set": {"expense": payload.amount}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    return Delivery(**delivery)


@api_router.post("/staff/collections/{collection_id}/accept", response_model=CollectionItem)
async def accept_collection(collection_id: str) -> CollectionItem:
    result = await db.collections.update_one({"id": collection_id}, {"$set": {"status": "Accepted"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    collection = await db.collections.find_one({"id": collection_id}, {"_id": 0})
    notification = {"id": f"alert-{uuid4().hex[:8]}", "title": "Amount Accepted", "message": f"{collection['shop_name']} cash accepted and shared with Admin and Salesman.", "priority": "low", "created_at": now_iso()}
    await db.alerts.insert_one(notification.copy())
    return CollectionItem(**collection)


@api_router.get("/salesman/catalog", response_model=SalesmanCatalogResponse)
async def get_salesman_catalog(salesman_id: str = Query("sales-1")) -> SalesmanCatalogResponse:
    products = await db.products.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    slabs = await db.discount_slabs.find({}, {"_id": 0}).sort("amount", 1).to_list(20)
    history = await db.bills.find({"salesman_id": salesman_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return SalesmanCatalogResponse(products=[Product(**product) for product in products], discount_slabs=[DiscountSlab(**slab) for slab in slabs], history=[Bill(**bill) for bill in history])


@api_router.get("/salesman/bills", response_model=List[Bill])
async def get_salesman_bills(salesman_id: str = Query("sales-1"), shop_name: str = Query("")) -> List[Bill]:
    query = {"salesman_id": salesman_id}
    if shop_name:
        query["shop_name"] = {"$regex": shop_name, "$options": "i"}
    bills = await db.bills.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Bill(**bill) for bill in bills]


@api_router.post("/salesman/bills", response_model=Bill)
async def create_bill(payload: BillCreate) -> Bill:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Add at least one product")
    products = await db.products.find({"id": {"$in": [item.product_id for item in payload.items]}}, {"_id": 0}).to_list(100)
    product_map = {product["id"]: product for product in products}
    lines: List[BillLine] = []
    subtotal = 0.0
    for item in payload.items:
        product = product_map.get(item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        line_total = calculate_line_total(product, item.quantity)
        subtotal += line_total
        lines.append(BillLine(product_id=item.product_id, product_name=product["name"], quantity=item.quantity, unit_price=float(product["price"]), line_total=line_total))
        updated_stock = max(int(product["stock"]) - item.quantity, 0)
        await db.products.update_one({"id": item.product_id}, {"$set": {"stock": updated_stock}})
        if updated_stock <= 5:
            alert = {"id": f"alert-{uuid4().hex[:8]}", "title": "Low Stock at Shop", "message": f"{payload.salesman_name} is nearly out of {product['name']} at {payload.shop_name}.", "priority": "high", "created_at": now_iso()}
            await db.alerts.insert_one(alert.copy())
    slab = await db.discount_slabs.find_one({"id": payload.discount_slab_id}, {"_id": 0}) if payload.discount_slab_id else None
    automatic_discount = float(slab["amount"]) if slab else 0.0
    bill = Bill(id=f"bill-{uuid4().hex[:8]}", salesman_id=payload.salesman_id, salesman_name=payload.salesman_name, shop_name=payload.shop_name, location=payload.location, items=lines, subtotal=round(subtotal, 2), manual_discount=round(payload.manual_discount, 2), automatic_discount=round(automatic_discount, 2), automatic_discount_label=slab["label"] if slab else None, authorized_by=slab["authorized_by"] if slab else None, total=max(round(subtotal - payload.manual_discount - automatic_discount, 2), 0), created_at=now_iso())
    await db.bills.insert_one(bill.model_dump().copy())
    return bill


app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
