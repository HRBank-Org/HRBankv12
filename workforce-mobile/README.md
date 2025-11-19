# HR Bank Workforce Mobile App

React Native mobile application for HR Bank workforce users.

## Features

- 🔐 Authentication (Login/Signup)
- ⏰ Clock In/Out with Geolocation
- 📋 Browse and Apply to Shifts
- 📊 View Timesheets and Earnings
- 📄 Upload Documents (Work Permit, SIN, etc.)
- 📅 Manage Availability Calendar
- 🔔 Push Notifications
- 👤 Profile Management

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio
- Expo Go app on your physical device (optional)

### Installation

```bash
cd /app/workforce-mobile
npm install
```

### Running the App

```bash
# Start development server
npm start

# Run on iOS simulator (Mac only)
npm run ios

# Run on Android emulator
npm run android

# Scan QR code with Expo Go app on physical device
```

## Backend Configuration

 The app connects to:
- **Preview:** https://hrbank-workforce.preview.emergentagent.com/api
- **Production:** https://hrbank.ca/api

Update `src/constants/config.js` to switch between environments.

## Project Structure

```
/workforce-mobile
├── App.js                 # Root component
├── package.json          # Dependencies
├── app.json              # Expo configuration
├── src/
│   ├── screens/          # App screens
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API services
│   ├── context/          # React Context providers
│   ├── utils/            # Utility functions
│   └── constants/        # Constants and config
```

## Key Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - Development toolchain
- **React Navigation** - Navigation library
- **Axios** - HTTP client
- **AsyncStorage** - Local storage
- **Expo Location** - Geolocation
- **Expo Notifications** - Push notifications

## Ontario Compliance

- Minimum wage: $17.60/hour
- Vacation pay: 4%
- Overtime: 1.5x after 44 hours/week
- ESA compliance tracking

## Support

For issues or questions, contact HR Bank support.
