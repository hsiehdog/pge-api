-- Add CHECK constraint to ensure usage_hour has minutes and seconds set to 0
ALTER TABLE "energy_usage" 
ADD CONSTRAINT "usage_hour_minutes_seconds_zero" 
CHECK (
  EXTRACT(MINUTE FROM usage_hour) = 0 AND 
  EXTRACT(SECOND FROM usage_hour) = 0
);
