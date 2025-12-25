"""
Blockchain Credential Service
==============================
Handles credential hashing, signing, and verification on Ethereum/Polygon.
Uses EIP-712 typed data signing for secure credential registration.
"""

import os
import json
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()

# Try to import web3, provide fallback for demo mode
try:
    from web3 import Web3
    from eth_account import Account
    from eth_account.messages import encode_defunct, encode_typed_data
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    print("Warning: web3 not available, running in demo mode")


class BlockchainCredentialService:
    """
    Service for issuing and verifying blockchain-backed credentials.
    Supports both Ethereum and Polygon networks.
    """
    
    # Contract ABI for CredentialRegistry (simplified)
    CREDENTIAL_REGISTRY_ABI = [
        {
            "inputs": [{"name": "_credentialHash", "type": "bytes32"}],
            "name": "registerCredential",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "_credentialHash", "type": "bytes32"}],
            "name": "revokeCredential",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_issuer", "type": "address"},
                {"name": "_credentialHash", "type": "bytes32"}
            ],
            "name": "isCredentialValid",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_issuer", "type": "address"},
                {"name": "_credentialHash", "type": "bytes32"}
            ],
            "name": "getCredentialStatus",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    # Network configurations
    NETWORKS = {
        "polygon_mainnet": {
            "chain_id": 137,
            "rpc_url": "https://polygon-rpc.com",
            "explorer": "https://polygonscan.com",
            "name": "Polygon Mainnet"
        },
        "polygon_amoy": {
            "chain_id": 80002,
            "rpc_url": "https://rpc-amoy.polygon.technology",
            "explorer": "https://amoy.polygonscan.com",
            "name": "Polygon Amoy Testnet"
        },
        "ethereum_sepolia": {
            "chain_id": 11155111,
            "rpc_url": "https://sepolia.infura.io/v3/YOUR_KEY",
            "explorer": "https://sepolia.etherscan.io",
            "name": "Ethereum Sepolia Testnet"
        },
        "ethereum_mainnet": {
            "chain_id": 1,
            "rpc_url": "https://mainnet.infura.io/v3/YOUR_KEY",
            "explorer": "https://etherscan.io",
            "name": "Ethereum Mainnet"
        }
    }
    
    def __init__(self, 
                 network: str = "polygon_amoy",
                 issuer_private_key: Optional[str] = None,
                 contract_address: Optional[str] = None):
        """
        Initialize the blockchain credential service.
        
        Args:
            network: Network to use (polygon_amoy, polygon_mainnet, etc.)
            issuer_private_key: Private key for signing credentials
            contract_address: Address of deployed CredentialRegistry contract
        """
        self.network = network
        self.network_config = self.NETWORKS.get(network, self.NETWORKS["polygon_amoy"])
        self.contract_address = contract_address or os.environ.get("CREDENTIAL_REGISTRY_ADDRESS")
        self.issuer_private_key = issuer_private_key or os.environ.get("ISSUER_PRIVATE_KEY")
        
        # Initialize Web3 if available
        self.w3 = None
        self.contract = None
        self.issuer_address = None
        
        if WEB3_AVAILABLE and self.issuer_private_key:
            try:
                rpc_url = os.environ.get(f"{network.upper()}_RPC_URL", self.network_config["rpc_url"])
                self.w3 = Web3(Web3.HTTPProvider(rpc_url))
                
                # Derive issuer address from private key
                account = Account.from_key(self.issuer_private_key)
                self.issuer_address = account.address
                
                # Initialize contract if address provided
                if self.contract_address:
                    self.contract = self.w3.eth.contract(
                        address=Web3.to_checksum_address(self.contract_address),
                        abi=self.CREDENTIAL_REGISTRY_ABI
                    )
            except Exception as e:
                print(f"Warning: Could not initialize Web3: {e}")
                self.w3 = None
    
    def calculate_credential_hash(self, credential_data: Dict[str, Any]) -> str:
        """
        Calculate SHA256 hash of credential data.
        This hash represents the credential on the blockchain.
        
        Args:
            credential_data: Dictionary containing credential information
            
        Returns:
            Hex string of the credential hash (0x prefixed)
        """
        # Sort keys for consistent hashing
        canonical_json = json.dumps(credential_data, sort_keys=True, separators=(',', ':'))
        hash_bytes = hashlib.sha256(canonical_json.encode('utf-8')).digest()
        return "0x" + hash_bytes.hex()
    
    def create_credential(self, 
                         subject_address: str,
                         credential_type: str,
                         credential_data: Dict[str, Any],
                         valid_from: Optional[datetime] = None,
                         valid_to: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Create a new blockchain credential.
        
        Args:
            subject_address: Wallet address of credential recipient
            credential_type: Type of credential (transcript, certificate, etc.)
            credential_data: The actual credential data to hash
            valid_from: When credential becomes valid
            valid_to: When credential expires
            
        Returns:
            Dictionary containing credential details and signature
        """
        if not valid_from:
            valid_from = datetime.now(timezone.utc)
        if not valid_to:
            # Default: 100 years validity
            valid_to = datetime(valid_from.year + 100, valid_from.month, valid_from.day, tzinfo=timezone.utc)
        
        # Calculate credential hash
        credential_hash = self.calculate_credential_hash(credential_data)
        
        # Create credential ID
        credential_id = f"cred_{uuid4().hex[:12]}"
        
        # Create the credential object
        credential = {
            "credential_id": credential_id,
            "credential_hash": credential_hash,
            "issuer": self.issuer_address or "demo_issuer",
            "subject": subject_address,
            "credential_type": credential_type,
            "valid_from": int(valid_from.timestamp()),
            "valid_to": int(valid_to.timestamp()),
            "network": self.network,
            "chain_id": self.network_config["chain_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending_registration",
            "blockchain_verified": False
        }
        
        # Sign the credential if we have a private key
        if WEB3_AVAILABLE and self.issuer_private_key:
            signature = self._sign_credential(
                subject_address=subject_address,
                credential_hash=credential_hash,
                valid_from=credential["valid_from"],
                valid_to=credential["valid_to"]
            )
            credential["signature"] = signature
        else:
            # Demo signature for testing
            credential["signature"] = {
                "v": 27,
                "r": "0x" + "0" * 64,
                "s": "0x" + "0" * 64,
                "full_signature": "0x" + "0" * 130,
                "demo_mode": True
            }
        
        return credential
    
    def _sign_credential(self,
                        subject_address: str,
                        credential_hash: str,
                        valid_from: int,
                        valid_to: int) -> Dict[str, Any]:
        """
        Sign credential using EIP-712 typed data signing.
        
        Returns:
            Dictionary with signature components (v, r, s)
        """
        if not WEB3_AVAILABLE or not self.issuer_private_key:
            raise ValueError("Web3 or private key not available for signing")
        
        # EIP-712 domain data
        domain_data = {
            "name": "CredentialRegistry",
            "version": "1",
            "chainId": self.network_config["chain_id"],
            "verifyingContract": self.contract_address or "0x0000000000000000000000000000000000000000"
        }
        
        # Message types
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"}
            ],
            "Credential": [
                {"name": "issuer", "type": "address"},
                {"name": "subject", "type": "address"},
                {"name": "credentialHash", "type": "bytes32"},
                {"name": "validFrom", "type": "uint256"},
                {"name": "validTo", "type": "uint256"}
            ]
        }
        
        # Message data
        message = {
            "issuer": self.issuer_address,
            "subject": subject_address,
            "credentialHash": credential_hash,
            "validFrom": valid_from,
            "validTo": valid_to
        }
        
        # Create structured data for signing
        structured_data = {
            "types": types,
            "primaryType": "Credential",
            "domain": domain_data,
            "message": message
        }
        
        try:
            # Sign using EIP-712
            encoded = encode_typed_data(full_message=structured_data)
            signed = Account.sign_message(encoded, self.issuer_private_key)
            
            return {
                "v": signed.v,
                "r": hex(signed.r),
                "s": hex(signed.s),
                "full_signature": signed.signature.hex()
            }
        except Exception as e:
            # Fallback to simple message signing
            message_hash = Web3.keccak(text=f"{self.issuer_address}{subject_address}{credential_hash}{valid_from}{valid_to}")
            signed = Account.sign_message(encode_defunct(message_hash), self.issuer_private_key)
            
            return {
                "v": signed.v,
                "r": hex(signed.r),
                "s": hex(signed.s),
                "full_signature": signed.signature.hex(),
                "signing_method": "fallback"
            }
    
    async def register_on_chain(self, credential_hash: str) -> Dict[str, Any]:
        """
        Register a credential hash on the blockchain.
        
        Args:
            credential_hash: The hash to register
            
        Returns:
            Transaction details
        """
        if not self.w3 or not self.contract or not self.issuer_private_key:
            return {
                "success": False,
                "error": "Blockchain connection not configured",
                "demo_mode": True,
                "message": "In demo mode - credential would be registered on-chain"
            }
        
        try:
            # Build transaction
            account = Account.from_key(self.issuer_private_key)
            nonce = self.w3.eth.get_transaction_count(account.address)
            
            tx = self.contract.functions.registerCredential(
                Web3.to_bytes(hexstr=credential_hash)
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.issuer_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            return {
                "success": True,
                "transaction_hash": tx_hash.hex(),
                "block_number": receipt["blockNumber"],
                "gas_used": receipt["gasUsed"],
                "explorer_url": f"{self.network_config['explorer']}/tx/{tx_hash.hex()}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_credential(self, 
                               issuer_address: str, 
                               credential_hash: str) -> Dict[str, Any]:
        """
        Verify a credential on the blockchain.
        
        Args:
            issuer_address: Address of the credential issuer
            credential_hash: Hash of the credential to verify
            
        Returns:
            Verification result
        """
        if not self.w3 or not self.contract:
            # Demo mode verification
            return {
                "is_valid": True,
                "is_registered": True,
                "is_revoked": False,
                "verification_method": "demo",
                "message": "Demo mode - would verify on blockchain",
                "network": self.network,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        try:
            # Check if credential is valid (registered and not revoked)
            is_valid = self.contract.functions.isCredentialValid(
                Web3.to_checksum_address(issuer_address),
                Web3.to_bytes(hexstr=credential_hash)
            ).call()
            
            # Check revocation status
            is_revoked = self.contract.functions.getCredentialStatus(
                Web3.to_checksum_address(issuer_address),
                Web3.to_bytes(hexstr=credential_hash)
            ).call()
            
            return {
                "is_valid": is_valid and not is_revoked,
                "is_registered": is_valid or is_revoked,  # If revoked, it was registered
                "is_revoked": is_revoked,
                "verification_method": "blockchain",
                "network": self.network,
                "chain_id": self.network_config["chain_id"],
                "contract_address": self.contract_address,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {
                "is_valid": False,
                "error": str(e),
                "verification_method": "failed"
            }
    
    def generate_qr_data(self, credential: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate data for QR code verification.
        
        Args:
            credential: The credential object
            
        Returns:
            Data to encode in QR code
        """
        return {
            "type": "hrbank_credential",
            "version": "1.0",
            "credential_id": credential.get("credential_id"),
            "credential_hash": credential.get("credential_hash"),
            "issuer": credential.get("issuer"),
            "network": credential.get("network"),
            "chain_id": credential.get("chain_id"),
            "verify_url": f"https://hrbank.ca/verify/{credential.get('credential_id')}"
        }


# Singleton instance for easy access
_blockchain_service = None

def get_blockchain_service() -> BlockchainCredentialService:
    """Get or create the blockchain credential service instance."""
    global _blockchain_service
    if _blockchain_service is None:
        _blockchain_service = BlockchainCredentialService()
    return _blockchain_service
