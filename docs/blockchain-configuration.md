# HR Bank Blockchain Configuration

## Issuer Wallet (Polygon Mainnet)

### ✅ Active Issuer Wallet
| Field | Value |
|-------|-------|
| **Address** | `0x3d382B658021f7df33a7afCc3C7A1caD4214c00B` |
| **Network** | Polygon Mainnet (Chain ID: 137) |
| **Purpose** | Signs and pays gas for credential minting |

### How to Fund
1. Send **MATIC on Polygon network** (NOT Ethereum) to:
   ```
   0x3d382B658021f7df33a7afCc3C7A1caD4214c00B
   ```
2. Recommended: Keep at least **1 MATIC** for ~75 credential mints
3. Cost per mint: ~0.013 MATIC ($0.0015 USD)

### ⚠️ Do NOT Use These Wallets
| Wallet | Address | Reason |
|--------|---------|--------|
| qnizami Portal | `0x8a9C7F6656F111e5ab7Dc14a3681C72a68C485a8` | Smart contract - funds get forwarded |
| Old Issuer | Any other address | Not configured in backend |

---

## Third-Party Services

### Pinata (IPFS Storage)
- **Purpose:** Stores credential metadata permanently on IPFS
- **Gateway:** `https://gateway.pinata.cloud/ipfs/`
- **Config:** `PINATA_API_KEY` and `PINATA_SECRET_KEY` in `.env`

### Infura (Polygon RPC)
- **Purpose:** Connects to Polygon blockchain
- **Network:** Polygon Mainnet
- **Config:** `INFURA_API_KEY` and `POLYGON_MAINNET_RPC_URL` in `.env`

---

## Environment Variables (backend/.env)

```bash
# Blockchain Credential Issuer Wallet (Polygon Mainnet)
ISSUER_WALLET_ADDRESS=0x3d382B658021f7df33a7afCc3C7A1caD4214c00B
ISSUER_PRIVATE_KEY=<keep-secure>

# Pinata IPFS
PINATA_API_KEY=<your-key>
PINATA_SECRET_KEY=<your-secret>

# Infura Polygon RPC
INFURA_API_KEY=<your-key>
POLYGON_MAINNET_RPC_URL=https://polygon-mainnet.infura.io/v3/<your-key>
```

---

## Credential Minting Flow

1. **Institution issues credential** → Backend receives request
2. **Metadata uploaded to IPFS** → Returns permanent `ipfs://` URL
3. **Transaction signed** → Issuer wallet signs with private key
4. **Minted on Polygon** → Transaction confirmed on-chain
5. **Response returned** → Includes transaction hash, IPFS URL, QR code

### Example Response
```json
{
  "credential_id": "HRBANK-2026-AC4A1C",
  "transaction_hash": "0x2432602d41189e239f5daef3d47560eec2f12a8432a055a74f75874afc3b81f8",
  "ipfs_url": "ipfs://bafkreigeklewut5ll3epw27pahram3yeysst6xlyidfvkrbxyqy6b2gmly",
  "explorer_url": "https://polygonscan.com/tx/0x...",
  "on_chain": true,
  "blockchain_status": "confirmed"
}
```

---

## Monitoring

### Check Issuer Balance
```bash
# Via PolygonScan
https://polygonscan.com/address/0x3d382B658021f7df33a7afCc3C7A1caD4214c00B

# Via API
GET /api/blockchain-credentials/issuer-status?network=polygon
```

### Low Balance Alert
When balance < 0.5 MATIC, fund the wallet to continue minting.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Insufficient funds" | Send more MATIC to issuer wallet |
| "Transaction failed" | Check gas price, retry |
| "IPFS upload failed" | Check Pinata API keys |
| "RPC connection error" | Verify Infura API key |

---

*Last Updated: January 28, 2026*
