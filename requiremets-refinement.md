P0a: Ship or Don't Launch
These are the bare minimum to test the core hypothesis ("unified shopping list is valuable"):
FeatureP0a Scope (Minimum)New Recruit ImportFull — this is the differentiator, no cutsModel Shopping ListFull — core value prop #1Paint DatabaseFull — you've validated 1440 paints, ship itPaint InventorySearch + toggle owned. No browse-by-hierarchy yetPaint RecipesName + ordered list of paints. No method dropdown, no notes fieldRecipe-to-Unit LinkingOne recipe per unit, simple pickerPaint Shopping ListFull — core value prop #2Status Tracking3 statuses only: To Buy → Owned → CompleteWeb AppResponsive web. PWA "installable" can wait

P0b: Strong Want, Descope If Behind
FeatureWhat Gets DeferredBarcode ScannerShip if time allows; manual search validates the conceptManual Collection EntryBasic add/edit only. Cut batch operations, cut filters/sortingFull 6-Status WorkflowThe 3 intermediate statuses (Assembled, Primed, Painted, Based) are hobbyist nice-to-haves, not shopping-list-criticalRecipe Method/Notes"Basecoat, Layer, Wash" dropdowns and per-step notes — useful but not required to generate a paint listCollection ViewsFilters, sorts, card-vs-list toggle — all P0b polishDashboardA simple project list is enough; completion %, recent activity, etc. can wait

The Logic
The P0a question is: What's the minimum to let a user go from "I have a New Recruit list" to "here's what I need to buy" for both models AND paints?
That flow doesn't require:

6 granular statuses (To Buy/Owned/Complete covers shopping decisions)
Recipe technique metadata (you just need to know which paints, not how they're applied)
Barcode scanning (painful without it, but search works)
Fancy filtering/sorting (you have one project with ~20 units — you can scroll)

If you ship P0a and users actually complete the flow and come back, you've validated the hypothesis. Then P0b becomes your fast-follow based on what users complain about first (my bet: barcode scanning and the missing statuses).

One Risk with This Split
Cutting to 3 statuses means you lose the "progress gamification" angle from the UX principles. The visual journey from "on sprue" → "assembled" → "primed" → "battle ready" is part of what makes apps like Pile of Potential sticky.
If retention matters as much as first-session validation, consider keeping the 6 statuses in P0a but cutting the Collection Views polish instead. The statuses are a database enum — cheap to implement. The views are UI work — expensive to polish.