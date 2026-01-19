https://docs.google.com/document/d/15YLinjr59SMO5zy4FVGWNFB7MtkdTVVp/edit

PRODUCT REQUIREMENTS DOCUMENT
Integrated Hobby Management Application
Version 1.0 | January 2026 | MVP Specification
1. Executive Summary
This document defines the Minimum Viable Product (MVP) requirements for an integrated hobby management application targeting the tabletop wargaming community. The application addresses a critical market gap: no existing solution connects army list building, miniature collection tracking, paint inventory management, and shopping list generation into a unified workflow.
Market research confirms that hobbyists currently juggle 3-4 separate applications (BattleScribe/New Recruit for lists, paintRack for paints, Pile of Potential for progress tracking, and spreadsheets to connect them). This fragmentation creates friction, redundant data entry, and the persistent question: "What do I need to buy to finish this army project?"
Our application will be the first to answer this question by integrating all three data domains: army composition, model collection status, and paint inventory.
2. Primary User Journey
The MVP is designed around a specific, high-value user journey that represents the core problem we are solving:
REFERENCE USER JOURNEY: Army Expansion Project
Alex owns a Kruleboyz Spearhead force (approximately 500 points) that is fully painted. Alex wants to expand this into a competitive 2,000-point army list they found on Goonhammer.
Alex needs to:
Import their existing painted collection into the app
Import the target 2,000-point army list (from New Recruit JSON)
See which models they need to buy to complete the list
Record the paint recipes used on their existing Gutrippaz so they can maintain consistency
Plan paint recipes for new units (e.g., Gobsprakk) and see which paints they need to buy
Track progress as they build and paint each unit toward completion


3. MVP Scope Definition
The MVP focuses exclusively on features that directly enable the primary user journey. Features are categorized as Must Have (P0), Should Have (P1), and Could Have (P2). Only P0 features are required for MVP launch.
Priority
Feature
Rationale
P0
Manual Collection Entry: Add units/models to collection with name, quantity, faction
Core requirement - must know what user owns
P0
Project Status Tracking: Status per unit (To Buy, Owned, Assembled, Primed, Painted, Based)
Enables progress visualization and completion tracking
P0
New Recruit JSON Import: Parse exported army lists to create project templates
Critical differentiator - automates project setup
P1
BattleScribe .rosz Import: Parse legacy roster files
Large existing user base still on BattleScribe
P0
Model Shopping List: Auto-generate list of units in army list not in collection
Core value proposition - answers "what models to buy"
P1
Retailer Links (Generic): Link to search results on retailers (not direct product links)
Avoids GW IP issues; enables future affiliate revenue
P0
Paint Database: Searchable database of paints (Citadel, Vallejo, Army Painter minimum)
Foundation for all paint features
P0
Paint Inventory: Mark paints as owned/not owned
Required for paint shopping list generation
P0
Paint Recipes: Create named recipes with ordered paint steps
Solves "recipe amnesia" - remembering colors used
P0
Recipe-to-Unit Linking: Assign recipes to specific units in a project
Enables contextual paint lookup and shopping list
P0
Paint Shopping List: Show paints needed for assigned recipes that user doesn't own
Second core value prop - answers "what paints to buy"
P1
Barcode Scanner: Scan paint pots to add to inventory
Dramatically improves onboarding (paintRack users expect this)
P0
Cross-Platform: Web application (PWA) accessible on desktop and mobile
Research shows platform exclusivity is top complaint
P1
Cloud Sync: User accounts with data persistence
Required for multi-device use; enables premium tier
P2
Native Mobile Apps: iOS and Android apps
Nice to have; PWA covers mobile use initially


4. Data Model
The application requires a relational data model that connects projects, units, paints, and recipes. This is the core technical innovation that enables our differentiation.
4.1 Core Entities
Entity
Key Fields
Relationships
Project
id, name, faction, game_system, target_points
Has many ProjectUnits; Belongs to User
ProjectUnit
id, name, quantity, status, points_cost
Belongs to Project; Has one Recipe (optional)
Recipe
id, name, description, author_id
Has many RecipeSteps; Can be assigned to many ProjectUnits
RecipeStep
id, step_order, method, notes
Belongs to Recipe; References one Paint
Paint
id, name, brand, range, hex_color, barcode
Referenced by RecipeSteps; Tracked in UserInventory
UserInventory
user_id, paint_id, owned (boolean)
Junction table linking Users to owned Paints


4.2 Status Enum Values
The ProjectUnit.status field uses the following ordered enum, representing the standard hobby workflow:
TO_BUY - Unit is in target list but not yet purchased
OWNED - Unit purchased but not yet assembled ("on sprue")
ASSEMBLED - Unit built and ready for priming
PRIMED - Unit has basecoat/primer applied
PAINTED - Unit painting complete (battle-ready)
BASED - Unit fully complete including basing

5. Detailed Feature Specifications
5.1 Army List Import (New Recruit JSON)
New Recruit exports army lists in a structured JSON format via their Reports API. The import feature must:
Accept JSON file upload or paste
Parse unit names, quantities, and point costs
Create a new Project with all units set to TO_BUY status
Allow user to mark units they already own (batch status update)
Display import summary: total units, total points, units owned vs. needed

Technical Note: New Recruit JSON uses human-readable unit names. No fuzzy matching is required for MVP as we store the imported name directly. Matching to retail products is out of scope for MVP.
5.2 Collection Management
Users must be able to manage their collection both within projects and as a global inventory.
Manual Entry
Add unit: name (free text), quantity, faction (dropdown), game system (dropdown)
Edit unit: all fields editable
Delete unit: with confirmation
Batch status update: select multiple units, change status in one action
Collection View Options
Filter by: status, faction, game system
Sort by: name, status (workflow order), date added
View as: list or card grid

5.3 Paint Database & Inventory
Database Requirements (MVP)
The MVP paint database must include the three most common brands in the Warhammer community:
Citadel (Games Workshop) - ~300 paints across all ranges (Base, Layer, Shade, Contrast, Technical, etc.)
Vallejo Game Color & Model Color - ~400 paints
The Army Painter - ~300 paints
Each paint record includes: name, brand, range/line, hex color value (for UI display), and barcode (where available).
User Inventory
Search paints by name (autocomplete)
Browse by brand/range hierarchy
Toggle owned/not owned with single click
View "My Paints" filtered list showing only owned paints

5.4 Paint Recipes
Recipe Creation
Name (required): e.g., "Kruleboyz Skin"
Description (optional): technique notes, inspiration source
Steps (ordered list):
Paint selection (from database)
Method dropdown: Basecoat, Layer, Wash, Drybrush, Edge Highlight, Glaze, Technical
Notes (optional): "thin coats", "recess only", etc.
Recipe Assignment
From unit detail view: "Assign Recipe" button opens recipe picker
Recipe picker shows user's recipes with search/filter
One recipe per unit (MVP constraint; multiple recipe support in Milestone 2)
Assigned recipe displays inline on unit card with paint swatch previews

5.5 Shopping List Generation
The unified shopping list is the killer feature that differentiates this application. It combines model needs and paint needs into a single actionable view.
Model Shopping List Logic
Query: All ProjectUnits where status = TO_BUY
Display: Unit name, quantity needed, points cost
Action: "Mark as Owned" button advances status to OWNED
Paint Shopping List Logic
Query: For all ProjectUnits with an assigned Recipe, get all RecipeSteps, join to Paint, filter where UserInventory.owned = false
Deduplication: Group by paint_id (same paint needed for multiple units shows once)
Display: Paint name, brand, color swatch, list of units requiring this paint
Action: "Mark as Owned" button adds paint to inventory
GW Legal Considerations
To avoid intellectual property issues with Games Workshop and other manufacturers:
Do NOT display GW product images or official artwork
Do NOT link directly to GW store product pages
Do NOT include GW-specific rules data (points are user-entered from their own list)
DO allow generic retailer search links (e.g., search Element Games for "Gutrippaz")
DO use unit names as they are user-generated from list import

6. UX Design Principles
Market research identified that Brushrage (the closest competitor in feature scope) fails due to UX complexity. Users describe it as requiring technical savvy and having a steep learning curve. Our design must prioritize simplicity.
6.1 Design Principles
Progressive Disclosure: Show essential features first; advanced features available but not prominent
One Primary Action Per Screen: Each view has a clear purpose and main action
Visual Progress: Use progress bars, color coding, and completion percentages to gamify workflow
Instant Value: User should see benefit within 2 minutes of first use (import list, see shopping needs)

6.2 Key Screens (MVP)
Screen
Purpose & Key Elements
Dashboard
Overview of all projects with completion %, quick access to shopping list, recent activity
Project Detail
List of all units in project, status indicators, progress bar, filter/sort controls
Unit Detail
Unit info, status selector, assigned recipe display, paint list with ownership indicators
Shopping List
Two sections: Models Needed, Paints Needed. Mark as purchased actions. Export/share.
Paint Inventory
Browse/search paints, toggle owned, view by brand/range
Recipe Editor
Name, description, ordered step list with paint picker and method selector
Import Wizard
Step-by-step: upload file > review units > mark owned > create project


7. Technical Recommendations
Based on the requirement for cross-platform support (web + mobile) with a small development team, the following stack is recommended:
Layer
Technology
Rationale
Frontend
React + TypeScript (PWA)
Single codebase, works offline, installable on mobile
Backend/Database
Firebase (Firestore + Auth)
Generous free tier, real-time sync, handles auth
Search
Algolia or MeiliSearch
Fast autocomplete for paint search; critical for UX
Hosting
Vercel or Firebase Hosting
Free tier sufficient for MVP; easy deployment
Barcode Scanning
QuaggaJS or ZXing
Browser-based scanning; no native app required


8. Release Roadmap
8.1 MVP (Milestone 1) - Target: 12 Weeks
All P0 features as defined in Section 3. Success criteria:
User can import New Recruit JSON and see model shopping list within 2 minutes
User can create recipe, assign to unit, see paint shopping list
User can track unit status through full workflow
Paint database includes 1,000+ paints from 3 major brands

8.2 Milestone 2 - Ecosystem Expansion (Post-MVP +8 Weeks)
BattleScribe .rosz import parser
Barcode scanner for paint inventory
Cloud sync with user accounts
Expanded paint database (10,000+ paints, 20+ brands)
Multiple recipes per unit (different sub-assemblies)
Retailer affiliate link integration

8.3 Milestone 3 - Community & Monetization (Post-MVP +16 Weeks)
Public recipe sharing (community library)
Public project profiles (like Pile of Potential)
Premium tier ($3-5/month): unlimited cloud backup, advanced stats, priority support
Paint color matching across brands (Vallejo equivalent of Citadel paint)
Session timer and hobby statistics

8.4 Milestone 4 - Advanced Features (Future)
3D printing integration: track STL files, print queue, resin consumption
Native iOS and Android apps
Photo gallery per unit (before/after, WIP shots)
AI-powered recipe suggestions based on army/faction
Multi-game system support beyond Warhammer (Star Wars Legion, Marvel Crisis Protocol, etc.)

9. Explicitly Out of Scope for MVP
The following features, while valuable, are explicitly excluded from MVP to maintain focus:
Army list BUILDING (creating lists with rules validation) - use New Recruit/BattleScribe
Rules reference or datasheet display - use Wahapedia or official app
Direct retail product linking/purchasing (legal risk)
Social features (following users, activity feeds, comments)
Tutorial or how-to-paint content
Commission painter business features (invoicing, client management)

10. Success Metrics
Metric
MVP Target
Measurement
Time to First Value
< 2 minutes
Analytics: import to shopping list view
D7 Retention
> 30%
Users returning within 7 days of signup
Projects Created per User
> 1.5 average
Indicates engagement beyond trial
Recipes Created per Project
> 2 average
Indicates paint feature adoption
Beta User NPS
> 40
Survey at end of beta period


Appendix A: Competitive Landscape Summary
This section summarizes key competitors identified in the market research. Our application fills the integration gap between these vertical solutions.
Competitor
Strength
Weakness
Our Advantage
paintRack
25k+ paints, barcode scan, industry standard
No project tracking, no list integration
Paint + project + list unified
Pile of Potential
Simple UX, progress gamification, shareable
No paint tracking, manual entry only
Import lists, include paints
Brushrage
Comprehensive features, time tracking
Steep learning curve, stability issues
Simpler UX, focused scope
New Recruit
Modern list builder, collection tracking (paid)
No paint integration
Complement with paint layer
BattleScribe
Ubiquitous, community data, free
Abandoned, no collection, no paint
Import their files, add missing features

