-- Drop existing function
DROP FUNCTION IF EXISTS handle_inventory_movement;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage inventory movements" ON inventory_movements;
DROP POLICY IF EXISTS "Anyone can view inventory movements" ON inventory_movements;

-- Create new RLS policies
CREATE POLICY "Anyone can view inventory movements"
  ON inventory_movements
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert inventory movements"
  ON inventory_movements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add check constraints for inventory items
ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_quantity_check,
  ADD CONSTRAINT inventory_items_quantity_check CHECK (quantity >= 0),
  DROP CONSTRAINT IF EXISTS inventory_items_minimum_quantity_check,
  ADD CONSTRAINT inventory_items_minimum_quantity_check CHECK (minimum_quantity >= 0);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS inventory_items_name_idx ON inventory_items(name);
CREATE INDEX IF NOT EXISTS inventory_items_quantity_idx ON inventory_items(quantity);
CREATE INDEX IF NOT EXISTS inventory_movements_item_id_idx ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS inventory_movements_created_at_idx ON inventory_movements(created_at);