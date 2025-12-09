# HR Bank Workforce Mobile App

React Native mobile application for HR Bank workforce users built with Expo.

## ✨ Features Implemented (Week 1 - Foundation)

### Authentication & Authorization
- ✅ Login screen with JWT integration
- ✅ Signup screen with validation
- ✅ EULA acceptance flow
- ✅ AsyncStorage token management
- ✅ Auto-login on app restart
- ✅ AuthContext with session management

### Core Infrastructure
- ✅ Shared components library (buttons, inputs)
- ✅ API service layer with axios
- ✅ Navigation structure (Auth & Main tabs)
- ✅ Storage utilities
- ✅ Color theming system
- ✅ Configuration management

### UI/UX
- ✅ Bottom tab navigation
- ✅ Dashboard screen with greeting
- ✅ SafeAreaView for notch support
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Studio
- Expo Go app on physical device (optional)

### Installation

```bash
cd /app/workforce-mobile
yarn install
```

### Running the App

```bash
# Start development server
yarn start

# Run on iOS simulator (Mac only)
yarn ios

# Run on Android emulator
yarn android

# Scan QR code with Expo Go app on physical device
```

## 📁 Project Structure

```
/workforce-mobile
├── App.js                          # Root component
├── package.json                    # Dependencies
├── app.json                        # Expo configuration
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.js        # Main app navigation
│   │   ├── AuthNavigator.js       # Auth flow navigation
│   │   └── MainNavigator.js       # Bottom tabs navigation
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js     # Login page
│   │   │   ├── SignupScreen.js    # Signup page
│   │   │   └── EULAScreen.js      # EULA acceptance
│   │   └── dashboard/
│   │       └── DashboardScreen.js # Home dashboard
│   └── components/                # App-specific components

/mobile-shared (Shared with Employer app)
├── components/
│   └── common/
│       ├── Button.js              # Reusable button
│       └── Input.js               # Reusable input field
├── services/
│   ├── api.js                     # Axios instance
│   └── auth.service.js            # Auth API calls
├── utils/
│   └── storage.js                 # AsyncStorage helpers
├── constants/
│   ├── config.js                  # App configuration
│   └── colors.js                  # Color palette
└── contexts/
    └── AuthContext.js             # Authentication state
```

## 🔐 Authentication Flow

1. User opens app
2. App checks AsyncStorage for auth token
3. If token exists:
   - Fetch user data from `/api/users/me`
   - Check EULA acceptance status
   - If EULA not accepted, show EULA screen
   - Otherwise, navigate to main app
4. If no token:
   - Show login/signup screens
5. After login:
   - Save JWT tokens to AsyncStorage
   - Check EULA status
   - Navigate appropriately

## 🔌 API Integration

The app connects to the HR Bank backend API:

**Base URL**: https://labordeck.preview.emergentagent.com/api

### Endpoints Used
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `GET /users/me` - Get current user profile
- `GET /eula/check` - Check EULA acceptance status
- `POST /eula/accept` - Accept EULA

### Authentication
All API requests include JWT token in headers:
```
Authorization: Bearer <access_token>
```

## 🎨 Theming

The app uses a consistent color scheme defined in `mobile-shared/constants/colors.js`:

- **Primary**: #30496d (Workforce blue)
- **Success**: #10b981 (Green)
- **Error**: #ef4444 (Red)
- **Warning**: #f59e0b (Orange)
- **Info**: #3b82f6 (Blue)

## 📱 Testing on Device

### iOS (TestFlight - Coming Soon)
1. Install TestFlight from App Store
2. Use invitation link (will be provided)
3. Install HR Bank Workforce app

### Android (Google Play Internal Testing - Coming Soon)
1. Join testing program via link (will be provided)
2. Install from Google Play Store

### Development Testing (Expo Go)
1. Install Expo Go app
2. Run `yarn start` on development machine
3. Scan QR code with camera (iOS) or Expo Go app (Android)

## 🔧 Environment Configuration

Create a `.env` file (optional, defaults provided):

```env
API_BASE_URL=https://labordeck.preview.emergentagent.com/api
```

## 📦 Key Dependencies

- **expo**: ~50.0.0 - Development platform
- **react-native**: 0.73.0 - Mobile framework
- **@react-navigation**: Navigation library
- **axios**: HTTP client
- **@react-native-async-storage/async-storage**: Local storage
- **expo-location**: Geolocation services
- **expo-camera**: QR code scanning
- **expo-notifications**: Push notifications

## 🚧 Coming Next (Week 2-3)

- [ ] Job browsing and application
- [ ] Job offers management
- [ ] Interview scheduling
- [ ] Profile management
- [ ] Document upload
- [ ] Emma AI chat integration
- [ ] Calendar and availability
- [ ] Clock-in/out functionality

## 🐛 Known Issues

None currently reported.

## 📝 License

Proprietary - HR Bank © 2024

## 👥 Support

For issues or questions, contact the development team.
