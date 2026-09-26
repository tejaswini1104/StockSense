"""Database seed script to populate sample data if database is empty."""

import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.category import Category
from app.models.location import Location, LocationType
from app.models.product import Product
from app.models.receipt import Receipt, ReceiptItem, ReceiptStatus
from app.models.stock_ledger import StockLedger
from app.models.stock_quant import StockQuant
from app.models.user import User, UserRole
from app.models.warehouse import Warehouse

logger = logging.getLogger("stocksense.seed")


def seed_data_if_empty(db: Session) -> None:
    # Ensure default admin and manager users exist with known passwords
    admin_user = db.scalars(select(User).where(func.lower(User.email) == "admin@stocksense.com")).first()
    if not admin_user:
        admin_user = User(
            email="admin@stocksense.com",
            hashed_password=hash_password("Admin123!"),
            name="StockSense Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
    else:
        admin_user.hashed_password = hash_password("Admin123!")
        admin_user.is_active = True

    manager_user = db.scalars(select(User).where(func.lower(User.email) == "manager@stocksense.com")).first()
    if not manager_user:
        manager_user = User(
            email="manager@stocksense.com",
            hashed_password=hash_password("Manager123!"),
            name="Inventory Manager",
            role=UserRole.MANAGER,
            is_active=True,
        )
        db.add(manager_user)
    else:
        manager_user.hashed_password = hash_password("Manager123!")
        manager_user.is_active = True

    db.commit()

    # Check if warehouses exist
    existing_wh = db.scalars(select(Warehouse)).first()
    if existing_wh:
        return

    logger.info("Seeding initial inventory data (Warehouses, Categories, Products, Locations)...")

    # 1. Warehouses & Locations
    wh1 = Warehouse(code="WH-MAIN", name="Central Warehouse", address="100 Logistics Blvd, Zone A")
    wh2 = Warehouse(code="WH-WEST", name="West Coast Distribution", address="500 Supply Way, Dock 4")
    db.add_all([wh1, wh2])
    db.commit()
    db.refresh(wh1)
    db.refresh(wh2)

    loc1 = Location(warehouse_id=wh1.id, code="LOC-MAIN-STOCK", name="Main Stock Room", location_type=LocationType.INTERNAL)
    loc2 = Location(warehouse_id=wh1.id, code="LOC-MAIN-REC", name="Receiving Dock A", location_type=LocationType.RECEIVING)
    loc3 = Location(warehouse_id=wh2.id, code="LOC-WEST-STOCK", name="Pallet Rack B2", location_type=LocationType.INTERNAL)
    db.add_all([loc1, loc2, loc3])
    db.commit()
    db.refresh(loc1)

    # 2. Categories
    cat1 = Category(name="Raw Materials", description="Metals, plastics, and raw inputs")
    cat2 = Category(name="Electronics", description="Semiconductors, sensors, and ICs")
    cat3 = Category(name="Hardware", description="Fasteners, bolts, and mechanical fittings")
    db.add_all([cat1, cat2, cat3])
    db.commit()
    db.refresh(cat1)
    db.refresh(cat2)
    db.refresh(cat3)

    # 3. Products
    p1 = Product(
        sku="PROD-STEEL-001",
        name="Steel Rods 10mm",
        description="High tensile structural steel rods",
        category_id=cat1.id,
        uom="Meters",
        min_reorder_qty=20.0,
        max_reorder_qty=150.0,
    )
    p2 = Product(
        sku="PROD-ELEC-502",
        name="STM32 Microcontroller",
        description="32-bit ARM Cortex-M4 MCU",
        category_id=cat2.id,
        uom="Units",
        min_reorder_qty=50.0,
        max_reorder_qty=500.0,
    )
    p3 = Product(
        sku="PROD-BOLT-108",
        name="M8 Brass Hex Bolt",
        description="Corrosion resistant brass fastener",
        category_id=cat3.id,
        uom="Boxes",
        min_reorder_qty=15.0,
        max_reorder_qty=100.0,
    )
    db.add_all([p1, p2, p3])
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    # 4. Stock Quants
    q1 = StockQuant(product_id=p1.id, location_id=loc1.id, quantity=120.0)
    q2 = StockQuant(product_id=p2.id, location_id=loc1.id, quantity=15.0)  # Low stock trigger!
    db.add_all([q1, q2])
    db.commit()

    # 5. Ledger entries
    l1 = StockLedger(
        reference_number="INIT-STOCK-01",
        movement_type="INITIAL",
        product_id=p1.id,
        destination_location_id=loc1.id,
        quantity=120.0,
        notes="Opening inventory count",
    )
    l2 = StockLedger(
        reference_number="INIT-STOCK-02",
        movement_type="INITIAL",
        product_id=p2.id,
        destination_location_id=loc1.id,
        quantity=15.0,
        notes="Opening inventory count",
    )
    db.add_all([l1, l2])
    db.commit()

    # 6. Sample Receipt (Draft)
    rec1 = Receipt(
        reference_number="REC-2026-9001",
        supplier_name="Acme Metals Corp",
        destination_location_id=loc1.id,
        status=ReceiptStatus.DRAFT,
        notes="Quarterly shipment of steel & bolts",
        items=[
            ReceiptItem(product_id=p1.id, quantity=50.0),
            ReceiptItem(product_id=p3.id, quantity=25.0),
        ],
    )
    db.add(rec1)
    db.commit()

    logger.info("Sample inventory data successfully seeded!")
