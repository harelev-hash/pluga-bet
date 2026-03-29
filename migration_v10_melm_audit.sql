-- Migration v10: Audit trail for מלמ resap actions

-- Track who handled each item row (and when)
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS resap_performed_by UUID REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE melm_items ADD COLUMN IF NOT EXISTS resap_performed_at TIMESTAMPTZ;

-- Track who closed the request (and when)
ALTER TABLE melm_requests ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES app_users(id) ON DELETE SET NULL;
ALTER TABLE melm_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
