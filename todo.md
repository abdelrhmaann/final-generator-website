# GenSizer Pro — TODO

## Layout & Infrastructure
- [x] Global dark navy engineering theme with CSS variables
- [x] Sidebar navigation with module tabs
- [x] Project header panel (project name, engineer, date, reference)
- [x] Responsive layout with sidebar and main content area
- [x] DB schema: projects, calculations, session history tables
- [x] tRPC routers for saving/loading calculations

## Module 1: Generator kVA Sizing (Step Load Method)
- [x] Load step input form (name, kW, kVA, PF, load type, starting kVA multiplier)
- [x] Add / remove / reorder load steps
- [x] Step-by-step calculation: cumulative kW, starting kVA surge, max kVA demand
- [x] Recommended standard generator size (kVA series 20–2250 kVA)
- [x] Loading percentage display with color-coded bar
- [x] Signature step load bar chart (stacked kVA bars over time)
- [x] Results summary cards
- [x] Standard kVA series display with recommended size highlighted

## Module 2: Voltage Dip Calculator
- [x] Inputs: generator kVA, X"d (%), motor starting kVA
- [x] Exact formula: Vdip% = (motorStartKVA) / (genKVA / Xd + motorStartKVA) × 100
- [x] Animated SVG gauge visualization
- [x] IEC pass/fail: <15% general, <10% sensitive
- [x] Remediation recommendations on fail
- [x] Standard X"d table by generator size
- [x] Full calculation breakdown

## Module 3: Fuel Consumption Estimator
- [x] Inputs: generator kW, load factor %
- [x] SFC curve: 100%→0.27, 75%→0.29, 50%→0.33, 25%→0.40 L/kWh (exact)
- [x] Output: L/hr consumption
- [x] Tank sizes for 8hr, 24hr, 72hr autonomy
- [x] Tank dimensions guide
- [x] SFC curve chart with operating point marker

## Module 4: ATS / Change-Over Sizing
- [x] Inputs: generator kVA, load current (A), voltage
- [x] Recommended ATS rating (A)
- [x] ATS type recommendation (open/closed transition)
- [x] Motorized vs manual changeover recommendation
- [x] Standard ATS rating series display

## Module 5: Generator Room Ventilation Estimator
- [x] Inputs: generator kW, room dimensions (L × W × H)
- [x] Heat rejection (kW) calculation
- [x] Required airflow (m³/hr) per ISO 8528
- [x] Inlet and exhaust louver area (m²)
- [x] Minimum room dimensions check
- [x] Recommended louver sizes with positioning guidance

## Session History
- [x] Save calculation sessions (localStorage-based within session)
- [x] List and recall previous sessions
- [x] Delete session history entries

## Export
- [x] PDF export: formal generator sizing submittal report
- [x] Excel export: all inputs and results

## Standards Reference Panel
- [x] IEC 60034, ISO 8528, IEC 60364, SEC standby power
- [x] Embedded kVA series table (20–2250 kVA)
- [x] X"d values by generator size table
- [x] SFC curve reference chart

## Testing
- [x] Unit tests for all calculation formulas (29 tests pass)
- [x] tRPC router tests (auth logout)
