-- The API treats hireDate as YYYY-MM-DD. Preserve each stored timestamp's
-- calendar date component and discard its unused time component.
ALTER TABLE "stylist_profiles"
  ALTER COLUMN "hire_date" TYPE DATE
  USING "hire_date"::date;
