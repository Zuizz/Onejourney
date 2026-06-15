# OneJourney

OneJourney is a multimodal commute planner. It helps users search routes, compare travel options, rank journeys with personal preferences, book a trip, and follow live trip updates with built-in safety controls.

## Features

- Station autocomplete and route search for real city commutes.
- Multimodal planning across Local, Metro, Bus, Auto, Cab, and Ferry.
- Commute DNA ranking to personalize results by cost, speed, safety, comfort, and sustainability.
- Booking flow with live journey tracking through server-sent events.
- Journey dashboard, alternate-route switching, and SOS support.
- Route metrics for duration, cost, CO2, safety, and comfort.

## Usage Example

1. Open the app in the browser.
2. Enter a start point and destination.
3. Select the transport modes you want to include.
4. Review the route list and compare the metrics.
5. Book a route to start live trip tracking.
6. Use the live journey screen to switch routes, share location, or trigger SOS if needed.

Example flow:

From: Bandra
To: CST
Modes: Local + Metro + Bus

## Environment Friendly

- Shows CO2 estimates for each route.
- Highlights greener transit-first options.
- Helps users compare routes based on lower emissions, not only speed.
- Encourages public transport choices over road-only travel.

## Unique Features

- Commute DNA: route ranking adapts to personal priorities.
- Live journey tracking: trip progress updates in real time.
- Route switching: move to an alternate route during an active trip.
- City dashboard: quick overview of transit insights.
- Mumbai-specific station graph and route generation logic.

## Safety

- Share live location with emergency contacts.
- Women-friendly route preference.
- Safe zone alerts during the journey.
- SOS action for emergency escalation.
- Live alerts when route conditions change.

## Tech Stack

- Frontend: React 19, Vite
- Backend: Node.js, Express
- Styling: CSS and component-level inline styles
- UI Icons: lucide-react
- Charts / Visuals: Recharts
- Data Transport: Fetch API and Server-Sent Events
- Tooling: concurrently and Vite scripts

## Project Structure

- `src/` contains the React UI and screens.
- `server/` contains the Express API and route generation logic.
- `api/` contains the Vercel-style server entry.
- `public/` contains static assets.

## Available Scripts

- `npm run dev` starts the frontend.
- `npm run server` starts the local API server.
- `npm run dev:full` runs both frontend and backend together.
- `npm run build` creates a production build.
- `npm run preview` previews the production build locally.

## Overview

The app is designed as a simple, mobile-style transit experience. The user starts on the home screen, searches for a route, compares results, customizes preferences through Commute DNA, books a route, and then follows a live trip with safety tools and real-time status updates.