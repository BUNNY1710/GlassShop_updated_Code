-- Add height_unit and width_unit to quotation_items
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS height_unit VARCHAR(10) DEFAULT 'FEET',
ADD COLUMN IF NOT EXISTS width_unit VARCHAR(10) DEFAULT 'FEET',
ADD COLUMN IF NOT EXISTS design VARCHAR(50);

-- Add transportation_required to quotations
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS transportation_required BOOLEAN DEFAULT false;

-- Update existing records to have FEET as default unit
UPDATE quotation_items SET height_unit = 'FEET' WHERE height_unit IS NULL;
UPDATE quotation_items SET width_unit = 'FEET' WHERE width_unit IS NULL;

