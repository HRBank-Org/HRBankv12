"""
Blockchain service for credential verification on Polygon
For MVP: Simulated blockchain operations
For Production: Replace with actual Web3.py integration
"""
import hashlib
import json
import os
from datetime import datetime
import uuid

class BlockchainService:
    def __init__(self):
        self.network = "Polygon Testnet (Mumbai)"
        self.contract_address = "0x1234567890ABCDEF1234567890ABCDEF12345678"  # Mock address
    
    async def mint_credential(self, credential_data: dict) -> dict:
        """
        Mint credential as NFT on Polygon blockchain
        
        In production, this would:
        1. Connect to Polygon network via Web3.py
        2. Call smart contract mintCredential() function
        3. Sign transaction with institution's private key
        4. Wait for transaction confirmation
        5. Return transaction hash
        
        For MVP: Simulated
        """
        
        # Generate mock transaction hash
        mock_tx_hash = "0x" + hashlib.sha256(
            f"{credential_data['credential_id']}{datetime.utcnow().timestamp()}".encode()
        ).hexdigest()
        
        # Mock IPFS upload
        mock_ipfs_hash = "Qm" + uuid.uuid4().hex[:40]
        mock_ipfs_url = f"ipfs://{mock_ipfs_hash}"
        
        # Simulate blockchain delay
        import time
        time.sleep(2)  # Simulate network confirmation
        
        return {
            "transaction_hash": mock_tx_hash,
            "block_number": 45123456,
            "ipfs_url": mock_ipfs_url,
            "token_id": str(uuid.uuid4().int)[:10],
            "gas_fee": 0.01,  # Mock gas fee in USD
            "status": "confirmed",
            "confirmation_time": datetime.utcnow().isoformat()
        }
    
    async def verify_credential(self, credential_hash: str) -> dict:
        """
        Verify credential exists on blockchain
        
        In production:
        1. Query smart contract
        2. Check credential hash
        3. Return status (valid/revoked/not_found)
        """
        
        # For MVP: Always return valid if hash exists
        if not credential_hash:
            return {
                "is_valid": False,
                "is_registered": False,
                "is_revoked": False,
                "status": "not_found",
                "on_chain": False,
                "verification_method": "demo",
                "network": "polygon",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        return {
            "is_valid": True,
            "is_registered": True,
            "is_revoked": False,
            "status": "active",
            "on_chain": True,
            "verification_method": "demo",
            "network": "polygon",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def revoke_credential(self, credential_id: str, reason: str) -> dict:
        """
        Revoke credential on blockchain
        
        In production:
        1. Call smart contract revokeCredential()
        2. Sign with institution private key
        3. Record revocation on-chain
        """
        
        mock_tx_hash = "0x" + hashlib.sha256(
            f"revoke_{credential_id}_{datetime.utcnow().timestamp()}".encode()
        ).hexdigest()
        
        return {
            "transaction_hash": mock_tx_hash,
            "revoked_at": datetime.utcnow().isoformat(),
            "reason": reason,
            "status": "revoked"
        }
    
    async def upload_to_ipfs(self, metadata: dict) -> str:
        """
        Upload credential metadata to IPFS
        
        In production: Use actual IPFS client or Pinata/Infura
        For MVP: Mock IPFS hash
        """
        
        mock_hash = "Qm" + hashlib.sha256(
            json.dumps(metadata, sort_keys=True).encode()
        ).hexdigest()[:40]
        
        return f"ipfs://{mock_hash}"
    
    def generate_verification_url(self, credential_id: str) -> str:
        """Generate public verification URL"""
        # Use REACT_APP_BACKEND_URL for external access, fall back to hrbank.ca
        frontend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://vault.hrbank.ca')
        # Remove /api from backend URL to get base frontend URL
        if '/api' in frontend_url:
            frontend_url = frontend_url.replace('/api', '')
        return f"{frontend_url}/verify/{credential_id}"
    
    def get_polygonscan_url(self, tx_hash: str) -> str:
        """Get PolygonScan explorer URL"""
        return f"https://mumbai.polygonscan.com/tx/{tx_hash}"

# Singleton instance
blockchain_service = BlockchainService()
