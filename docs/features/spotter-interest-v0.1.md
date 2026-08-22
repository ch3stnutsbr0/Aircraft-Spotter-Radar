# Spotter Interest v0.1

## 1. Purpose

The purpose of the **Spotter Interest** system is to estimate:

> How worthy of attention is a particular aircraft movement to an aviation photographer / plane spotter?

The system is not intended to measure only statistical rarity.

An aircraft may be highly interesting even if it appears frequently at a particular airport.

Examples:

- a special-livery aircraft may be based at the user's home airport and appear frequently;
- a globally rare aircraft type may be common at one particular hub;
- a common aircraft type may be interesting because a specific registration rarely visits the airport.

Therefore, Spotter Interest v0.1 evaluates several independent signals.

---

# 2. Version 0.1 Scope

Spotter Interest v0.1 contains four primary scoring dimensions:

```text
AircraftNotabilityScore
GlobalTypeRarityScore
LocalTypeRarityScore
RegistrationRarityScore
```

Conceptually:

```text
SpotterInterestScore =
    AircraftNotabilityScore   × w1
  + GlobalTypeRarityScore     × w2
  + LocalTypeRarityScore      × w3
  + RegistrationRarityScore   × w4
```

Each individual dimension uses a:

```text
0–100
```

score.

A score of `0` means:

> This dimension provides no additional spotting interest.

A score of `100` means:

> This dimension provides exceptionally strong spotting interest.

A low score in one dimension must not negatively penalize another dimension.

---

# 3. General Design Principles

1. Rarity and notability are separate concepts.
2. Local commonness is not inherently negative.
3. A locally common but globally rare aircraft may still be highly interesting.
4. A locally common aircraft with a special identity may still be highly interesting.
5. A common aircraft type may become interesting if a specific registration rarely visits the airport.
6. Every high score should be explainable through human-readable reasons.
7. Numerical scores are primarily internal.
8. User-facing UI should emphasize reasons rather than raw numbers.
9. Version 0.1 should remain rule-based and interpretable.
10. Machine learning is unnecessary for v0.1.
11. Local rarity provides positive bonus only; local commonness never subtracts points.
12. Dynamic operational events must remain separate from persistent aircraft characteristics.

---

# 4. Final Score Weights

Initial proposed weights:

```text
AircraftNotabilityScore:      35%

GlobalTypeRarityScore:        30%

LocalTypeRarityScore:         20%

RegistrationRarityScore:      15%
```

Equivalent formula:

```text
SpotterInterestScore =
    AircraftNotabilityScore   × 0.35
  + GlobalTypeRarityScore     × 0.30
  + LocalTypeRarityScore      × 0.20
  + RegistrationRarityScore   × 0.15
```

## Why these weights?

Aircraft Notability receives the highest weight because special liveries and historically significant individual airframes are among the strongest reasons a spotter may deliberately seek a specific aircraft.

Global Type Rarity is weighted almost as strongly because globally disappearing or limited aircraft types should remain important even if they happen to be common at a particular airport.

Local Type Rarity adds airport-specific value but should not dominate the ranking.

Registration Rarity is useful for distinguishing individual tails, but in a generic non-personalized Spotlight it should initially remain weaker than the first three dimensions.

These weights are provisional and should be tuned against manual ranking tests.

---

# 5. Dimension 1 — Aircraft Notability Score

## 5.1 Definition

`AircraftNotabilityScore` represents:

> Persistent or semi-persistent characteristics of a specific airframe that give it special visual, historical, production, fleet, or identity significance independent of how frequently it appears at the airport.

It answers:

> Is there something inherently notable about this particular airplane?

This score belongs to a specific physical airframe rather than the aircraft type generally.

---

# 6. Aircraft Notability Categories

## Visual Identity

```text
SPECIAL_LIVERY
RETRO_LIVERY
ANNIVERSARY_LIVERY
COMMEMORATIVE_LIVERY
PROMOTIONAL_LIVERY
ALLIANCE_LIVERY
ONE_OFF_LIVERY
```

## Production / Fleet Significance

```text
FIRST_OF_TYPE_FOR_AIRLINE
LAST_OF_TYPE_FOR_AIRLINE
FIRST_DELIVERED_TO_AIRLINE
LAST_DELIVERED_TO_AIRLINE
FIRST_PRODUCTION_AIRFRAME
LAST_PRODUCTION_AIRFRAME
PROTOTYPE
TEST_AIRCRAFT
```

## Historical Significance

```text
HISTORICALLY_SIGNIFICANT_AIRFRAME
OTHER_NOTABLE_HISTORY
```

Future additions may include:

```text
SPECIAL_REGISTRATION
NAMED_AIRCRAFT
PRESERVED_HERITAGE_LIVERY
MANUFACTURER_DEMONSTRATOR
```

---

# 7. Aircraft Notability Scoring Table

| Notability Category | Proposed Score | Notes |
|---|---:|---|
| Standard aircraft / standard livery | 0 | No intrinsic notability |
| Alliance livery | 20 | Visually distinct but relatively common category |
| Minor promotional livery | 30 | Limited visual significance |
| Anniversary / commemorative livery | 45 | More distinctive and usually temporary |
| Retro livery | 55 | Strong visual and historical appeal |
| Major special livery | 70 | Strong spotting value |
| Highly recognizable one-off livery | 90 | Very strong individual-aircraft interest |
| First aircraft of type for airline | 45 | Fleet significance |
| Last aircraft of type for airline | 55 | Often historically meaningful |
| First delivered aircraft of type | 50 | Strong fleet-history significance |
| Last delivered aircraft of type | 55 | Strong fleet-history significance |
| Prototype / test aircraft | 85 | Very unusual individual identity |
| First production airframe | 80 | Strong production significance |
| Last production airframe | 85 | Strong production/history significance |
| Historically significant airframe | 40–90 | Must be manually curated |
| Manufacturer demonstrator | 70 | Rare operational identity |

---

# 8. Multiple Notability Tags

Use:

```text
Highest score + reduced secondary contributions
```

Proposed formula:

```text
NotabilityScore =
primary_tag_score
+ 25% of second-highest tag score
+ 10% of third-highest tag score
```

Maximum:

```text
100
```

Example:

```text
ONE_OFF_LIVERY = 90
FIRST_OF_TYPE_FOR_AIRLINE = 45

90 + (45 × 0.25)
= 101.25
→ capped at 100
```

Reason:

Simple additive scoring would allow multiple minor tags to overpower genuinely exceptional aircraft.

Using only the highest tag would ignore meaningful combinations.

---

# 9. Historical Incidents and Accidents

Historical incident involvement should **not automatically increase Spotter Interest**.

Decision:

```text
Only manually curated cases
```

Historical information may be recorded in aircraft metadata, but it should affect `AircraftNotabilityScore` only when the airframe has recognized aviation-historical significance beyond accident curiosity.

Examples may include:

- historically significant survival/recovery;
- major aviation milestone;
- important engineering or operational history;
- highly documented airframe significance.

Routine incident history should not create a spotting bonus.

---

# 10. Dimension 2 — Global Aircraft Type Rarity Score

## Definition

`GlobalTypeRarityScore` represents:

> How uncommon a particular aircraft type or variant is across the active global fleet.

It answers:

> Regardless of airport, how unusual is it to see this aircraft type operating today?

---

# 11. Aircraft Type Granularity

Preferred v0.1 granularity:

```text
Variant-level where reliable data exists
```

Examples:

```text
A350-900
A350-1000

B747-400
B747-8I
B747-8F

B787-8
B787-9
B787-10
```

Passenger and cargo variants should be scored separately when their active fleet sizes and spotting relevance differ materially.

For example:

```text
B747-8I
```

and:

```text
B747-8F
```

should not necessarily receive identical rarity scores.

---

# 12. Global Rarity Metric

Primary v0.1 metric:

```text
Approximate active global fleet size for the specific aircraft variant
```

Future signals may include:

```text
Global movement frequency
Number of active operators
Fleet retirement trend
Production status
Remaining passenger examples
Remaining cargo examples
```

For v0.1, active global fleet size should be the primary metric because it is simple, interpretable, and relatively stable.

---

# 13. Global Type Rarity Scoring

Initial proposal:

| Active Global Fleet | Score |
|---:|---:|
| > 1000 | 0 |
| 500–1000 | 10 |
| 250–499 | 20 |
| 100–249 | 35 |
| 50–99 | 50 |
| 20–49 | 70 |
| 10–19 | 85 |
| < 10 | 100 |

These values should be treated as initial calibration rather than permanent thresholds.

---

# 14. Example Global Scores

Approximate intended behavior:

```text
A321neo            0–10

B737-800           0

A350-900           20

B787-9             15–20

A380               50–60

B747-8I            70–80

A340-600           75–85

MD-11              80–90

AN-124             90–100
```

Important:

These are target relative rankings for v0.1, not authoritative current fleet counts.

---

# 15. Dimension 3 — Local Aircraft Type Rarity Score

## Definition

`LocalTypeRarityScore` represents:

> How unusual a particular aircraft type or variant is at the user's selected Home Airport.

For v0.1:

```text
Home Airport = ATL
```

It answers:

> How unusual is it for this type of aircraft to operate at ATL?

---

# 16. Local Rarity Rule

Local rarity is a **positive bonus only**.

Common aircraft:

```text
LocalTypeRarityScore = 0
```

No aircraft receives negative rarity points because it is common locally.

Example:

```text
Globally rare aircraft:
GlobalTypeRarityScore = 85

But regularly based at ATL:
LocalTypeRarityScore = 0

Result:
Still strongly interesting.
```

---

# 17. Historical Window

Initial v0.1 window:

```text
Past 90 days
```

Reason:

90 days is long enough to smooth daily variation while still reflecting the airport's reasonably recent operating pattern.

Future versions should consider:

```text
7 days
30 days
90 days
365 days
```

to detect seasonal and recent rarity separately.

---

# 18. Local Rarity Metric

Initial metric:

```text
type_frequency =
    movements_of_variant_at_airport
    /
    total_airport_movements
```

However, raw percentage should eventually be reviewed because a mega-hub such as ATL has a very large denominator.

v0.1 will use this simple metric for interpretability.

---

# 19. Local Type Rarity Scoring

Initial proposal:

| ATL Historical Frequency | Score |
|---:|---:|
| >= 1.0% | 0 |
| 0.5–1.0% | 10 |
| 0.2–0.5% | 20 |
| 0.05–0.2% | 40 |
| 0.01–0.05% | 65 |
| < 0.01% | 90 |

Special case:

If no recorded movement exists during the historical window:

```text
LocalTypeRarityScore = 100
```

subject to sufficient data quality.

---

# 20. Local Rarity Examples

Target behavior:

### Delta A321 at ATL

```text
Expected LocalTypeRarityScore = 0
```

### Delta A350 at ATL

```text
Expected LocalTypeRarityScore = 0–10
```

### Lufthansa B747-8 at ATL

```text
Expected LocalTypeRarityScore = 50–75
```

### AN-124 at ATL

```text
Expected LocalTypeRarityScore = 90–100
```

---

# 21. Dimension 4 — Registration Local Visit Rarity Score

## Definition

`RegistrationRarityScore` represents:

> How unusual it is for this exact physical aircraft registration to visit the selected Home Airport.

It uses:

```text
Registration × Airport
```

rather than aircraft type.

It answers:

> Even if this aircraft type is common here, how unusual is this particular tail?

---

# 22. v0.1 Inputs

Use two inputs:

```text
visits_365d
days_since_last_visit
```

Reason:

`visits_365d` measures long-term local familiarity.

`days_since_last_visit` distinguishes an aircraft that used to visit frequently from one that has not appeared recently.

---

# 23. Registration Visit Count Score

Historical window:

```text
Past 365 days
```

Initial score:

| Visits in Past 365 Days | Base Score |
|---:|---:|
| > 30 | 0 |
| 15–30 | 10 |
| 8–14 | 20 |
| 4–7 | 35 |
| 2–3 | 50 |
| 1 | 70 |
| 0 | 90 |

---

# 24. Days Since Last Visit Bonus

Yes, use a separate bonus.

| Days Since Last ATL Visit | Bonus |
|---:|---:|
| < 30 | 0 |
| 30–89 | 5 |
| 90–179 | 10 |
| 180–364 | 20 |
| >= 365 | 30 |
| Never recorded at ATL | 40 |

Final calculation:

```text
RegistrationRarityScore =
min(100, VisitCountScore + LastVisitBonus)
```

---

# 25. Dynamic Operational Events — Out of Scope for v0.1

Dynamic operational events are not part of `AircraftNotabilityScore`.

Examples:

```text
Squawk 7700
Squawk 7600
Squawk 7500

Diversion
Go-around
Return to origin
Emergency landing
Unscheduled landing

Ferry flight
Delivery flight
Test flight
```

These describe:

> What is happening to the aircraft during the current operation.

They do not describe:

> What the aircraft inherently is.

They should eventually belong to:

```text
OperationalEventScore
```

Dynamic operational events are explicitly out of scope for v0.1.

---

# 26. Future Operational Event Policy

Potential future signals:

```text
DIVERSION
GO_AROUND
RETURN_TO_ORIGIN
UNSCHEDULED_LANDING
DELIVERY_FLIGHT
FERRY_FLIGHT
TEST_FLIGHT
SPECIAL_MISSION
```

Safety/emergency events such as 7700 should probably be surfaced primarily as operational information rather than treated automatically as entertainment-style spotting bonuses.

This policy should be revisited separately.

---

# 27. Future Context Modifiers

Out of scope for v0.1:

```text
LONG_HAUL
INTERNATIONAL
CARGO
CHARTER
FERRY
DELIVERY
UNUSUAL_ROUTE
GOVERNMENT
BUSINESS_JET
```

These should eventually belong to:

```text
ContextModifierScore
```

They should generally act as secondary modifiers rather than overpowering core aircraft interest.

Example future idea:

```text
Long-haul       small bonus
International  small bonus
Cargo           small/moderate bonus
Charter         moderate/high bonus
Delivery        high bonus
```

---

# 28. Future Personal Relevance

Out of scope for v0.1:

```text
Never photographed
Watchlisted registration
Favorite aircraft type
Favorite airline
Fleet collection gap
User-defined interests
Previous spotting history
```

These should eventually contribute through:

```text
PersonalRelevanceScore
```

This may ultimately become one of the strongest dimensions because Spotlight should eventually answer:

> What is worth YOUR attention today?

rather than only:

> What is objectively unusual today?

---

# 29. Long-Term Architecture

```text
SpotterInterestScore
│
├── AircraftNotabilityScore
│   ├── special livery
│   ├── historical significance
│   ├── first / last aircraft
│   └── prototype / special identity
│
├── GlobalTypeRarityScore
│
├── LocalTypeRarityScore
│
├── RegistrationRarityScore
│
├── OperationalEventScore          ← future
│
├── ContextModifierScore           ← future
│   ├── long haul
│   ├── international
│   ├── cargo
│   ├── charter
│   └── unusual route
│
└── PersonalRelevanceScore         ← future
    ├── never photographed
    ├── watchlist
    ├── favorite aircraft
    └── collection gap
```

---

# 30. User-Facing Explanation Tags

Numerical scores should normally remain internal.

Possible tags:

```text
SPECIAL_LIVERY
RETRO_LIVERY
HISTORICALLY_SIGNIFICANT
FIRST_OF_TYPE_FOR_AIRLINE
LAST_OF_TYPE_FOR_AIRLINE

GLOBALLY_UNCOMMON_TYPE
GLOBALLY_RARE_TYPE
EXTREMELY_RARE_TYPE

RARE_AT_HOME_AIRPORT
VERY_RARE_AT_HOME_AIRPORT

RARE_VISITOR
LONG_ABSENCE
FIRST_RECORDED_VISIT
```

Suggested UI text:

| Internal Tag | UI Text |
|---|---|
| SPECIAL_LIVERY | Special Livery |
| RETRO_LIVERY | Retro Livery |
| FIRST_OF_TYPE_FOR_AIRLINE | First of Type |
| LAST_OF_TYPE_FOR_AIRLINE | Last of Type |
| HISTORICALLY_SIGNIFICANT | Historically Notable |
| GLOBALLY_UNCOMMON_TYPE | Globally Uncommon Aircraft |
| GLOBALLY_RARE_TYPE | Globally Rare Aircraft |
| EXTREMELY_RARE_TYPE | Exceptionally Rare Aircraft |
| RARE_AT_HOME_AIRPORT | Rare at ATL |
| VERY_RARE_AT_HOME_AIRPORT | Very Rare at ATL |
| RARE_VISITOR | Rare ATL Visitor |
| LONG_ABSENCE | Long Time Since Last Visit |
| FIRST_RECORDED_VISIT | First Recorded ATL Visit |

---

# 31. Spotlight Eligibility

Every movement should receive an internal Spotter Interest Score.

```text
Yes
```

Initial thresholds:

### Interesting

```text
SpotterInterestScore >= 25
```

### Today's Spotlight Candidate

```text
SpotterInterestScore >= 40
```

Maximum main Spotlight display:

```text
Top 5
```

Rule:

```text
Show up to the Top 5 aircraft movements,
but only if SpotterInterestScore >= 40.
```

If only two aircraft exceed the threshold:

```text
Show two.
```

Do not artificially fill the section with routine aircraft.

---

# 32. Duplicate Aircraft Movements

The same aircraft may arrive and later depart ATL.

Normal movement list:

```text
Show both movements.
```

Today's Spotlight:

```text
Prefer one aircraft-level Spotlight entry by default.
```

The Spotlight card may display both opportunities:

```text
Arrival 15:20
Departure 18:05
```

if both movements are available.

Reason:

A user usually cares that the notable aircraft will be at ATL, not that it occupies two separate Top 5 positions.

Exceptions may be added later if arrival and departure have materially different spotting value.

---

# 33. Manual Test Priority Scale

```text
Priority 1 — Must Highlight
Priority 2 — Highly Interesting
Priority 3 — Somewhat Interesting
Priority 4 — Routine
```

---

# 34. Initial Test Cases

## Case 1 — Routine Delta A321

```text
Standard livery
Common ATL type
Common ATL registration
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     0
LocalTypeRarityScore:      0
RegistrationRarityScore:   0–10

Expected Priority:         4
```

---

## Case 2 — Standard Delta A350

```text
Standard livery
Globally moderately uncommon
Very common for its category at ATL
Regular ATL tail
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     20
LocalTypeRarityScore:      0–10
RegistrationRarityScore:   0–10

Expected Priority:         3
```

It may be interesting to browse but should not automatically dominate Spotlight.

---

## Case 3 — Delta Team USA A350

Expected:

```text
AircraftNotabilityScore:   90
GlobalTypeRarityScore:     20
LocalTypeRarityScore:      0
RegistrationRarityScore:   0–10

Expected Priority:         1
```

Required behavior:

Low local rarity must not suppress the aircraft.

---

## Case 4 — First A350 Delivered to Delta

Expected:

```text
AircraftNotabilityScore:   50
GlobalTypeRarityScore:     20
LocalTypeRarityScore:      0
RegistrationRarityScore:   0–10

Expected Priority:         2
```

---

## Case 5 — Lufthansa B747-8I at ATL

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     75
LocalTypeRarityScore:      60
RegistrationRarityScore:   30–60

Expected Priority:         1
```

This aircraft should score strongly even with standard livery.

---

## Case 6 — Globally Rare but Locally Common Type

Example:

```text
A hypothetical airport-based globally rare type
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     85
LocalTypeRarityScore:      0
RegistrationRarityScore:   low

Expected Priority:         2
```

Required behavior:

Global rarity remains valuable even when local rarity is zero.

---

## Case 7 — Common Type but Rare Registration

Example:

```text
Standard Delta A321
Specific registration with one ATL appearance in past year
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     0
LocalTypeRarityScore:      0
RegistrationRarityScore:   80–100

Expected Priority:         3
```

This should become noticeable, but probably not outrank genuinely globally rare or notable aircraft in a generic non-personalized Spotlight.

---

## Case 8 — AN-124 at ATL

Expected:

```text
AircraftNotabilityScore:   0–20
GlobalTypeRarityScore:     95
LocalTypeRarityScore:      100
RegistrationRarityScore:   80–100

Expected Priority:         1
```

Even without special livery, this should almost certainly be Spotlight-worthy.

---

## Case 9 — Special Livery Frequent ATL Visitor

Example:

```text
Delta special-livery A350 based at ATL
```

Expected:

```text
AircraftNotabilityScore:   70–90
GlobalTypeRarityScore:     20
LocalTypeRarityScore:      0
RegistrationRarityScore:   0

Expected Priority:         1–2
```

---

## Case 10 — Rare Type, Standard Livery, Frequent Registration

Example:

```text
Globally rare aircraft type
Regularly based at Home Airport
Standard livery
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     80
LocalTypeRarityScore:      0
RegistrationRarityScore:   0

Expected Priority:         2
```

---

## Case 11 — Lufthansa A330 at ATL

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     10–20
LocalTypeRarityScore:      20–40
RegistrationRarityScore:   10–30

Expected Priority:         3
```

---

## Case 12 — Korean Air B747-8F at ATL

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     60–75
LocalTypeRarityScore:      50–70
RegistrationRarityScore:   30–60

Expected Priority:         1–2
```

---

## Case 13 — Retro-Livery Narrowbody

Example:

```text
Common A321 type
Retro livery
Frequently visits ATL
```

Expected:

```text
AircraftNotabilityScore:   55
GlobalTypeRarityScore:     0
LocalTypeRarityScore:      0
RegistrationRarityScore:   0–10

Expected Priority:         2
```

This verifies that a common aircraft can become interesting through identity alone.

---

## Case 14 — Rare Tail of Standard A350

Example:

```text
Standard-livery A350
Registration has never previously been recorded at ATL
```

Expected:

```text
AircraftNotabilityScore:   0
GlobalTypeRarityScore:     20
LocalTypeRarityScore:      0–10
RegistrationRarityScore:   100

Expected Priority:         2–3
```

---

## Case 15 — Alliance-Livery Delta Narrowbody

Expected:

```text
AircraftNotabilityScore:   20
GlobalTypeRarityScore:     0
LocalTypeRarityScore:      0
RegistrationRarityScore:   low

Expected Priority:         3
```

It should be discoverable, but should generally not outrank one-off liveries or rare aircraft.

---

# 35. Initial Manual Reference Ranking

Approximate reference ranking:

```text
1. AN-124 at ATL
2. Delta Team USA A350
3. Lufthansa B747-8I
4. Korean Air B747-8F
5. Globally rare but locally common aircraft
6. First A350 delivered to Delta
7. Retro-livery narrowbody
8. Special-livery frequent ATL visitor
9. Rare-tail standard A350
10. Common type but rare registration
11. Lufthansa A330
12. Standard Delta A350
13. Alliance-livery Delta narrowbody
14. Routine Delta A321
```

The exact order is intentionally provisional.

The goal is not perfect numerical ranking yet.

The goal is to identify obvious ranking failures.

---

# 36. Algorithm Evaluation

Compare:

```text
Human Ranking
vs.
Algorithm Ranking
```

Record:

## False Positive

An aircraft ranked too highly.

```text
Aircraft:
Expected:
Actual:
Likely cause:
```

## False Negative

An aircraft ranked too low.

```text
Aircraft:
Expected:
Actual:
Likely cause:
```

## Weight Adjustment

```text
Changed dimension:
Old weight:
New weight:
Reason:
```

Prefer changing one major assumption at a time.

---

# 37. Definition of Success

Spotter Interest v0.1 succeeds if:

- routine ATL aircraft usually rank low;
- special liveries remain visible even when locally common;
- globally rare types remain valuable even when locally common;
- unusual ATL types receive additional local relevance;
- unusual individual registrations receive independent relevance;
- no dimension creates negative penalties for local commonness;
- highlighted aircraft always have understandable reasons;
- the Top Spotlight results broadly agree with manual spotter judgment;
- the algorithm can be debugged using dimension-level score breakdowns;
- weights can be changed without rewriting scoring logic.

---

# 38. Known Limitations

v0.1 does not consider:

```text
Dynamic emergencies
Squawk codes
Diversions
Go-arounds

Long-haul status
International status
Cargo operations
Charter operations
Ferry / delivery flights

Airline rarity
Route rarity
Seasonal rarity

User preferences
Photography history
Aircraft watchlists
Fleet collection progress

Runway suitability
Weather
Lighting
Photography conditions
Notification urgency
```

Additional known limitation:

Global rarity based only on active fleet size may not perfectly represent real-world spotting appeal.

Local rarity based on percentage of all ATL movements may need adjustment because ATL's extremely high traffic volume can distort small categories.

Registration rarity may become much more important once personalized collection tracking is implemented.

---

# 39. Candidate v0.2 Features

My preferred initial additions after v0.1:

```text
1. ContextModifierScore
   - cargo
   - charter
   - long-haul
   - international
   - unusual route

2. Airline / Route Local Rarity

3. PersonalRelevanceScore
   - not photographed
   - watchlist
   - collection gap
```

`OperationalEventScore` should probably be developed separately because it requires near-real-time data and a different event-processing architecture.

---

# 40. Core Principle

The system should always optimize for the question:

> Why is this aircraft worth this spotter's attention?

It should NOT optimize only for:

> How statistically rare is this aircraft?

Rarity is one input to relevance.

It is not the definition of relevance.