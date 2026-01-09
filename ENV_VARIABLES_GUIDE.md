# Environment Variables Guide for Deployment

This document lists all environment variables required for the HR Platform. 
**Never commit actual values to GitHub** - use AWS Secrets Manager or your deployment platform's secret management.

---

## Backend Environment Variables (`/app/backend/.env`)

### Database (Required)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `MONGO_URL` | MongoDB connection string | MongoDB Atlas or your MongoDB provider |
| `DB_NAME` | Database name | Your choice (e.g., `hrbank_prod`) |

### Authentication (Required)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `JWT_SECRET` | Secret key for JWT tokens | Generate: `openssl rand -hex 32` |

### URLs (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_URL` | Backend API URL | `https://api.yourdomain.com` |
| `FRONTEND_URL` | Frontend URL | `https://yourdomain.com` |
| `CORS_ORIGINS` | Allowed origins for CORS | `https://yourdomain.com,https://api.yourdomain.com` |

### Blockchain - Polygon (Required for Credentials)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `BLOCKCHAIN_NETWORK` | Network identifier | `polygon-mainnet` |
| `POLYGON_MAINNET_RPC_URL` | Polygon RPC endpoint | Infura, Alchemy, or QuickNode |
| `INFURA_API_KEY` | Infura project ID | [Infura Dashboard](https://infura.io/) |
| `ISSUER_WALLET_ADDRESS` | Wallet address for issuing | Your Polygon wallet |
| `ISSUER_PRIVATE_KEY` | Private key (KEEP SECURE!) | Your wallet private key |

### IPFS Storage (Required for Credentials)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `PINATA_API_KEY` | Pinata API key | [Pinata](https://pinata.cloud/) |
| `PINATA_SECRET_KEY` | Pinata secret key | Pinata dashboard |

### Stripe Payments (Required for Monetization)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `STRIPE_API_KEY` | Stripe API key | [Stripe Dashboard](https://dashboard.stripe.com/) |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Public key for frontend | Stripe dashboard |

### Email - SendGrid (Required for Notifications)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SENDGRID_API_KEY` | SendGrid API key | [SendGrid](https://sendgrid.com/) |
| `SENDGRID_FROM_EMAIL` | Verified sender email | Your verified domain email |

### Google Services (Required for Maps/Geocoding)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_MAPS_API_KEY` | Maps JavaScript API | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_DISTANCE_MATRIX_API_KEY` | Distance Matrix API | Google Cloud Console |
| `GOOGLE_TIMEZONE_API_KEY` | Timezone API | Google Cloud Console |

### Google OAuth (Required for Social Login)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_ID` | Same as above (legacy) | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Same as above (legacy) | Google Cloud Console |
| `GOOGLE_OAUTH_REDIRECT_URI` | OAuth callback URL | `https://yourdomain.com/auth/google/callback` |

### AI Services (Required for Emma AI)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `EMERGENT_LLM_KEY` | Emergent Universal Key | Emergent Platform (Profile > Universal Key) |

### SMS - Twilio (Optional)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio number | Twilio Console |

---

## Frontend Environment Variables (`/app/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | `https://api.yourdomain.com` |
| `REACT_APP_WORKFORCE_URL` | Workforce subdomain | `https://workforce.yourdomain.com` |
| `REACT_APP_EMPLOYER_URL` | Employer subdomain | `https://employer.yourdomain.com` |
| `REACT_APP_INSTITUTION_URL` | Institution subdomain | `https://institution.yourdomain.com` |
| `REACT_APP_ADMIN_URL` | Admin subdomain | `https://admin.yourdomain.com` |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | Maps API (frontend) | Same as backend Google Maps key |
| `REACT_APP_ENABLE_VISUAL_EDITS` | Feature flag | `false` (production) |
| `ENABLE_HEALTH_CHECK` | Health endpoint | `true` |
| `WDS_SOCKET_PORT` | Dev server port | `0` (production: remove) |

---

## AWS Secrets Manager Setup

For AWS deployment, create secrets with these paths:
```
/hrbank/prod/database     → MONGO_URL, DB_NAME
/hrbank/prod/auth         → JWT_SECRET, GOOGLE_* keys
/hrbank/prod/blockchain   → INFURA_*, ISSUER_*, POLYGON_*
/hrbank/prod/storage      → PINATA_*
/hrbank/prod/payments     → STRIPE_*
/hrbank/prod/email        → SENDGRID_*
/hrbank/prod/ai           → EMERGENT_LLM_KEY
/hrbank/prod/sms          → TWILIO_* (if used)
```

---

## Quick Checklist Before Deployment

- [ ] All backend env vars configured
- [ ] All frontend env vars configured
- [ ] CORS_ORIGINS updated with production domains
- [ ] Google OAuth redirect URI updated
- [ ] Stripe webhook endpoint configured
- [ ] SendGrid sender verified for production domain
- [ ] Blockchain wallet funded for gas fees
- [ ] SSL certificates configured

---

## Security Notes

1. **Never commit `.env` files** - The `.gitignore` is configured to exclude them
2. **Rotate keys periodically** - Especially JWT_SECRET and API keys
3. **Use different keys per environment** - Dev, staging, prod should have separate credentials
4. **Monitor API usage** - Set up alerts for unusual activity on Stripe, SendGrid, etc.
