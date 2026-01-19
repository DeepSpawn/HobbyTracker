# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HobbyTrackerApp is an integrated hobby management PWA for tabletop wargamers (Warhammer, etc.). It unifies army list importing, miniature collection tracking, paint inventory, and shopping list generation - solving the fragmentation problem where hobbyists currently juggle 3-4 separate apps.

**Core Value Proposition**: Answer "What do I need to buy to finish this army project?" by integrating army composition, model collection status, and paint inventory.

## Planned Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (PWA)
- **Styling**: Tailwind CSS
- **Backend/Database**: Firebase (Firestore + Auth)
- **Hosting**: Vercel
- **Paint Search**: Firestore with client-side filtering (MVP), potential Algolia/MeiliSearch later
- **Barcode Scanning**: QuaggaJS or ZXing (P0b feature)

## Key Documents

| File | Purpose |
|------|---------|
| `product-requirements.md` | Full PRD with features, data model, UX principles |
| `requiremets-refinement.md` | P0a vs P0b prioritization - what's truly MVP |
| `paint-database-plan.md` | Strategy for building 1400+ paint database from open source data |

## Data Model (Core Entities)

- **Project**: Army project (name, faction, gameSystem, targetPoints)
- **ProjectUnit**: Unit in a project (name, quantity, status, pointsCost, recipeId)
- **Recipe**: Paint recipe (name, description, steps)
- **RecipeStep**: Single step in recipe (stepOrder, paintId)
- **Paint**: Paint from database (name, brand, productLine, paintType, hexColor, sku)
- **UserInventory**: Junction table for user's owned paints

**Unit Status Flow (MVP)**: To Buy → Owned → Complete

## JIRA Backlog

- **Project**: HOB (HobbyTrackerApp)
- **Board**: https://gtaylor.atlassian.net/jira/software/projects/HOB/boards/47/backlog
- **Structure**: 9 Epics with Stories underneath
- **Labels**: Priority (P0a/P0b) + Size (S/M/L)

## Implementation Priority

1. Project Foundation (React/Firebase/Vercel setup)
2. Paint Database (import 1400+ paints from Arcturus5404/miniature-paints)
3. User Auth & Paint Inventory
4. Project & Collection Management
5. Army List Import (New Recruit JSON parser - key differentiator)
6. Paint Recipes
7. Shopping Lists (core value prop)
8. P0b Polish (responsive nav, 6-status workflow, barcode scanner)
