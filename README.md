# Smokey Grillz

A food-ordering app for Smokey Grillz, a grill restaurant in Kaduna, Nigeria. Customers browse the menu and order for pickup or delivery. Staff get live order alerts and work through the kitchen queue. Runs on Android and the web from one codebase.

Live web version: https://smokey-grillz.netlify.app

## Features

**Customers**
- Menu by category (Shawarma, Loaded Fries, Gas Meat, Noodles, Masa) with item options and sold-out display
- Cart and checkout for pickup or delivery, with delivery fees by zone
- Pay by card (Flutterwave), bank transfer or cash
- Live order tracking and saved delivery addresses

**Staff**
- Push notification on every new order, even with the app closed
- Claim an order so two staff never work the same one; claimed orders are locked to the claimer
- Move orders through confirm, preparing, ready, out for delivery and completed; mark transfers as paid

**Admin**
- Edit the menu, categories, prices and availability
- Set opening hours (ordering is blocked outside them), delivery zones, fees and bank details
- Give staff or admin roles to other users, and release claimed orders

## Tech stack

- Expo / React Native (Expo Router) for Android and web, written in TypeScript
- Supabase for Postgres, auth, row-level security, realtime and edge functions
- Flutterwave for card payments (edge functions for init, verify and webhook)
- Expo push notifications with Firebase Cloud Messaging on Android
- EAS Build for Android, Netlify for the web version

## Project layout

- `src/app` screens (routes), `src/components` UI, `src/lib` data and helpers, `src/providers` auth
- `supabase/migrations` database schema and policies
- `supabase/functions` edge functions (payments and order notifications)

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and public key
npx expo start               # press w for web, or use a development build on Android
```

The app needs `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the public anon key). Never put the service-role key in the app.

Android builds: `npx eas-cli build --profile preview --platform android`
