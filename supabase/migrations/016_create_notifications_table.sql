-- ==============================================================================
-- MIGRATION: 016_create_notifications_table.sql
-- ==============================================================================
-- Persistent notifications for low stock, inventory alerts, and shop activity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'low_stock',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT DEFAULT 'product',
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(shop_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(shop_id, entity_type, entity_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view notifications for their shop'
  ) THEN
    CREATE POLICY "Users can view notifications for their shop"
      ON notifications FOR SELECT
      USING (shop_id = get_user_shop_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can insert notifications for their shop'
  ) THEN
    CREATE POLICY "Users can insert notifications for their shop"
      ON notifications FOR INSERT
      WITH CHECK (shop_id = get_user_shop_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update notifications for their shop'
  ) THEN
    CREATE POLICY "Users can update notifications for their shop"
      ON notifications FOR UPDATE
      USING (shop_id = get_user_shop_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete notifications for their shop'
  ) THEN
    CREATE POLICY "Users can delete notifications for their shop"
      ON notifications FOR DELETE
      USING (shop_id = get_user_shop_id());
  END IF;
END $$;

