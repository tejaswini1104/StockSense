"""add delivery_orders and delivery_items tables

Revision ID: 6bb1897eff1c
Revises: 5aa0786dee0b
Create Date: 2026-09-26 13:00:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = '6bb1897eff1c'
down_revision: str | None = '5aa0786dee0b'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'delivery_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference_number', sa.String(length=50), nullable=False),
        sa.Column('customer_name', sa.String(length=150), nullable=False),
        sa.Column('source_location_id', sa.Integer(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('DRAFT', 'PICKED', 'PACKED', 'DONE', 'CANCELED', name='delivery_status', native_enum=False, length=20),
            nullable=False,
        ),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['source_location_id'], ['locations.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_delivery_orders_reference_number'), 'delivery_orders', ['reference_number'], unique=True)

    op.create_table(
        'delivery_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('delivery_order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['delivery_order_id'], ['delivery_orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('delivery_items')
    op.drop_index(op.f('ix_delivery_orders_reference_number'), table_name='delivery_orders')
    op.drop_table('delivery_orders')
