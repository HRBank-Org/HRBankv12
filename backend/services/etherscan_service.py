"""
Etherscan API Service
=====================
Integrates with Etherscan/Polygonscan APIs for:
- Wallet balance checking
- Transaction verification
- Contract verification
- Gas price estimation
"""

import os
import aiohttp
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()


class EtherscanService:
    """
    Service for interacting with Etherscan-compatible block explorer APIs.
    Supports Ethereum, Polygon, and other EVM chains.
    """
    
    # API endpoints for different networks
    NETWORKS = {
        "ethereum": {
            "chain_id": 1,
            "api_url": "https://api.etherscan.io/api",
            "explorer_url": "https://etherscan.io",
            "currency": "ETH",
            "name": "Ethereum Mainnet"
        },
        "ethereum_sepolia": {
            "chain_id": 11155111,
            "api_url": "https://api-sepolia.etherscan.io/api",
            "explorer_url": "https://sepolia.etherscan.io",
            "currency": "ETH",
            "name": "Ethereum Sepolia"
        },
        "polygon": {
            "chain_id": 137,
            "api_url": "https://api.polygonscan.com/api",
            "explorer_url": "https://polygonscan.com",
            "currency": "MATIC",
            "name": "Polygon Mainnet"
        },
        "polygon_amoy": {
            "chain_id": 80002,
            "api_url": "https://api-amoy.polygonscan.com/api",
            "explorer_url": "https://amoy.polygonscan.com",
            "currency": "MATIC",
            "name": "Polygon Amoy Testnet"
        },
        "base": {
            "chain_id": 8453,
            "api_url": "https://api.basescan.org/api",
            "explorer_url": "https://basescan.org",
            "currency": "ETH",
            "name": "Base Mainnet"
        }
    }
    
    def __init__(self, 
                 network: str = "polygon",
                 api_key: Optional[str] = None):
        """
        Initialize the Etherscan service.
        
        Args:
            network: Network to use (ethereum, polygon, etc.)
            api_key: Etherscan API key (optional for rate-limited access)
        """
        self.network = network
        self.network_config = self.NETWORKS.get(network, self.NETWORKS["polygon"])
        self.api_key = api_key or os.environ.get(f"{network.upper()}_ETHERSCAN_API_KEY") or os.environ.get("ETHERSCAN_API_KEY")
        self.api_url = self.network_config["api_url"]
        self.issuer_address = os.environ.get("ISSUER_WALLET_ADDRESS")
    
    async def _make_request(self, params: Dict[str, str]) -> Dict[str, Any]:
        """Make an API request to Etherscan."""
        if self.api_key:
            params["apikey"] = self.api_key
        
        async with aiohttp.ClientSession() as session:
            async with session.get(self.api_url, params=params) as response:
                data = await response.json()
                return data
    
    async def get_balance(self, address: str) -> Dict[str, Any]:
        """
        Get native token balance for an address.
        
        Args:
            address: Wallet address to check
            
        Returns:
            Dictionary with balance info
        """
        params = {
            "module": "account",
            "action": "balance",
            "address": address,
            "tag": "latest"
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("status") == "1":
                balance_wei = int(data["result"])
                balance = balance_wei / 1e18
                
                return {
                    "success": True,
                    "address": address,
                    "balance_wei": balance_wei,
                    "balance": balance,
                    "currency": self.network_config["currency"],
                    "network": self.network,
                    "formatted": f"{balance:.6f} {self.network_config['currency']}"
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Unknown error"),
                    "address": address
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "address": address
            }
    
    async def get_multi_balance(self, addresses: List[str]) -> Dict[str, Any]:
        """
        Get balances for multiple addresses (up to 20).
        
        Args:
            addresses: List of wallet addresses
            
        Returns:
            Dictionary with balances for each address
        """
        if len(addresses) > 20:
            addresses = addresses[:20]
        
        params = {
            "module": "account",
            "action": "balancemulti",
            "address": ",".join(addresses),
            "tag": "latest"
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("status") == "1":
                balances = []
                for item in data["result"]:
                    balance_wei = int(item["balance"])
                    balance = balance_wei / 1e18
                    balances.append({
                        "address": item["account"],
                        "balance_wei": balance_wei,
                        "balance": balance,
                        "formatted": f"{balance:.6f} {self.network_config['currency']}"
                    })
                
                return {
                    "success": True,
                    "balances": balances,
                    "currency": self.network_config["currency"],
                    "network": self.network
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Unknown error")
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        """
        Get transaction details by hash.
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction details
        """
        params = {
            "module": "proxy",
            "action": "eth_getTransactionByHash",
            "txhash": tx_hash
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("result"):
                tx = data["result"]
                return {
                    "success": True,
                    "transaction": {
                        "hash": tx.get("hash"),
                        "from": tx.get("from"),
                        "to": tx.get("to"),
                        "value": int(tx.get("value", "0x0"), 16) / 1e18,
                        "gas": int(tx.get("gas", "0x0"), 16),
                        "gasPrice": int(tx.get("gasPrice", "0x0"), 16) / 1e9,  # Gwei
                        "blockNumber": int(tx.get("blockNumber", "0x0"), 16) if tx.get("blockNumber") else None,
                        "input": tx.get("input")
                    },
                    "explorer_url": f"{self.network_config['explorer_url']}/tx/{tx_hash}"
                }
            else:
                return {
                    "success": False,
                    "error": "Transaction not found"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transaction_receipt(self, tx_hash: str) -> Dict[str, Any]:
        """
        Get transaction receipt (confirmation status).
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction receipt with status
        """
        params = {
            "module": "proxy",
            "action": "eth_getTransactionReceipt",
            "txhash": tx_hash
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("result"):
                receipt = data["result"]
                status = int(receipt.get("status", "0x0"), 16)
                
                return {
                    "success": True,
                    "confirmed": True,
                    "status": "success" if status == 1 else "failed",
                    "block_number": int(receipt.get("blockNumber", "0x0"), 16),
                    "gas_used": int(receipt.get("gasUsed", "0x0"), 16),
                    "contract_address": receipt.get("contractAddress"),
                    "logs_count": len(receipt.get("logs", [])),
                    "explorer_url": f"{self.network_config['explorer_url']}/tx/{tx_hash}"
                }
            else:
                return {
                    "success": True,
                    "confirmed": False,
                    "status": "pending"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_gas_price(self) -> Dict[str, Any]:
        """
        Get current gas price.
        
        Returns:
            Gas price in Gwei
        """
        params = {
            "module": "proxy",
            "action": "eth_gasPrice"
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("result"):
                gas_wei = int(data["result"], 16)
                gas_gwei = gas_wei / 1e9
                
                return {
                    "success": True,
                    "gas_price_wei": gas_wei,
                    "gas_price_gwei": gas_gwei,
                    "formatted": f"{gas_gwei:.2f} Gwei"
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Unknown error")
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_transaction_history(self, 
                                      address: str,
                                      start_block: int = 0,
                                      end_block: int = 99999999,
                                      page: int = 1,
                                      offset: int = 10) -> Dict[str, Any]:
        """
        Get transaction history for an address.
        
        Args:
            address: Wallet address
            start_block: Starting block number
            end_block: Ending block number
            page: Page number
            offset: Number of transactions per page
            
        Returns:
            List of transactions
        """
        params = {
            "module": "account",
            "action": "txlist",
            "address": address,
            "startblock": str(start_block),
            "endblock": str(end_block),
            "page": str(page),
            "offset": str(offset),
            "sort": "desc"
        }
        
        try:
            data = await self._make_request(params)
            
            if data.get("status") == "1":
                transactions = []
                for tx in data["result"]:
                    transactions.append({
                        "hash": tx.get("hash"),
                        "from": tx.get("from"),
                        "to": tx.get("to"),
                        "value": int(tx.get("value", "0")) / 1e18,
                        "timestamp": datetime.fromtimestamp(int(tx.get("timeStamp", "0")), tz=timezone.utc).isoformat(),
                        "block_number": int(tx.get("blockNumber", "0")),
                        "gas_used": int(tx.get("gasUsed", "0")),
                        "is_error": tx.get("isError") == "1",
                        "function_name": tx.get("functionName", "").split("(")[0] if tx.get("functionName") else None
                    })
                
                return {
                    "success": True,
                    "transactions": transactions,
                    "total": len(transactions),
                    "address": address
                }
            elif data.get("message") == "No transactions found":
                return {
                    "success": True,
                    "transactions": [],
                    "total": 0,
                    "address": address
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Unknown error")
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_issuer_status(self) -> Dict[str, Any]:
        """
        Get status of the configured issuer wallet.
        
        Returns:
            Issuer wallet status including balance
        """
        if not self.issuer_address:
            return {
                "success": False,
                "error": "No issuer address configured"
            }
        
        balance_result = await self.get_balance(self.issuer_address)
        gas_result = await self.get_gas_price()
        
        return {
            "success": True,
            "issuer_address": self.issuer_address,
            "network": self.network,
            "network_name": self.network_config["name"],
            "balance": balance_result if balance_result.get("success") else None,
            "gas_price": gas_result if gas_result.get("success") else None,
            "explorer_url": f"{self.network_config['explorer_url']}/address/{self.issuer_address}",
            "can_issue": balance_result.get("balance", 0) > 0.01 if balance_result.get("success") else False
        }
    
    def get_explorer_url(self, type: str, value: str) -> str:
        """
        Generate explorer URL for address, tx, or token.
        
        Args:
            type: 'address', 'tx', or 'token'
            value: The address, tx hash, or token address
            
        Returns:
            Explorer URL
        """
        base = self.network_config["explorer_url"]
        return f"{base}/{type}/{value}"


# Singleton instance
_etherscan_service = None

def get_etherscan_service(network: str = "polygon") -> EtherscanService:
    """Get or create the Etherscan service instance."""
    global _etherscan_service
    if _etherscan_service is None or _etherscan_service.network != network:
        _etherscan_service = EtherscanService(network=network)
    return _etherscan_service
