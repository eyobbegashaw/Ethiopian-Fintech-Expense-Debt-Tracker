# Ethio Debt Tracker - Ethiopian Splitwise Clone

A production-ready expense and debt tracking application for the Ethiopian context.

## Features

- ✅ Expense splitting (equal, percentage, custom)
- ✅ Group management (Roommates, Trip, Coffee Ceremony, Iddir, Equb)
- ✅ Debt simplification algorithm
- ✅ Settlement tracking with local payment methods (TeleBirr, CBE Birr, Amole)
- ✅ SMS notifications
- ✅ Real-time updates with Socket.io
- ✅ Ethiopian cultural context support

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Socket.io for real-time
- Twilio for SMS

### Mobile
- React Native
- React Navigation
- React Native Paper UI
- Axios for API calls

## Installation

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev