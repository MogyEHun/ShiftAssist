-- Super Admin kiegészítések: belső megjegyzések + feature flags a companies táblán
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';
