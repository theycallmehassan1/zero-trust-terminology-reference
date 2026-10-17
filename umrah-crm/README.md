# Umrah Agency CRM

A complete CRM for Umrah / Hajj travel agencies. It runs fully in the
browser. No server, no install, no monthly fee.

## How to run

Open `index.html` in Chrome or Edge (double-click it). To share it with your
team, host the folder on any static host (GitHub Pages, Netlify, etc.).

Demo data loads on first open so you can explore. Clear it from
**Settings → Erase All Data** when you are ready to use your real data.

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Sales, collected, receivable, profit, upcoming pilgrims, lead conversion. *Action Required* alerts for visas not approved near departure, unpaid balances, tickets not issued, passports expiring within 6 months of travel, missing passports. Follow-ups due today, 6-month collection chart, seat occupancy, activity log. |
| **Leads / Inquiries** | Kanban pipeline (New → Contacted → Quoted → Negotiation → Won / Lost) with drag & drop, or list view. Source tracking (Facebook, WhatsApp, Walk-in…), follow-up dates with overdue highlight, one-click WhatsApp, **➜ Book** converts a lead into a pilgrim + booking. |
| **Pilgrims** | Passport no. & expiry, CNIC, DOB, mahram (required check for women), emergency contact, document checklist (passport, CNIC, photos, vaccination, mahram proof, ticket), booking history. |
| **Packages** | Category, days, departure, airline, Makkah/Madinah hotels + nights + distance from Haram, transport, includes. Quad / Triple / Double pricing, cost per pilgrim (for profit), seat capacity with overbooking warning. **Share** copies a formatted WhatsApp/Facebook post. Duplicate a package. |
| **Bookings** | Multiple pilgrims per booking, auto price from package & room type, discount, auto departure/return dates, booking / visa / ticket status, PNR, sub-agent. Per-pilgrim readiness check. Printable **Invoice**, **Payment Receipt** and **Hotel/Travel Voucher**. WhatsApp balance message. |
| **Payments** | Receive partial payments / installments (Cash, Bank, JazzCash, Easypaisa, Cheque, Card) with receipt numbers. Receivables list sorted by departure with a one-click WhatsApp reminder. |
| **Visa Tracker** | Kanban board: Docs Pending → Docs Received → Submitted → Approved / Rejected. Flags bookings with document issues and close departures. |
| **Sub-Agents** | Commission %, bookings, pax, sales and commission due per agent. |
| **Expenses** | Visa fee, tickets, hotel, marketing, salary, rent… optionally linked to a booking. |
| **Reports** | Sales, package cost, gross & net profit, monthly sales, pilgrims per departure month, package performance, lead source conversion, pilgrims by city, expenses by category. |
| **Settings** | Agency name, phone, address, license, currency (PKR, SAR, USD, GBP, INR, BDT, AED), invoice footer. JSON backup / restore. |

Also included: global search (name, phone, passport, CNIC, booking ref, PNR),
CSV export on every list, dark mode, and a mobile-friendly layout.

## Data & privacy

All records live in this browser's `localStorage`. They are never sent
anywhere. Because the data includes passport and CNIC details:

- Download a backup from **Settings** regularly and keep it somewhere safe.
- Data does not sync between computers. To move it, restore the backup on the
  other machine.
- Clearing browser data deletes the CRM data, so back up first.
