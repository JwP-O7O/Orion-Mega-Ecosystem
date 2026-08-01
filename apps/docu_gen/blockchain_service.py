"""
Blockchain Service Module for DocuGen

This module provides Web3.py integration for interacting with the DocuGenRegistry
smart contract on Polygon blockchain.

Features:
    - Document hash generation (SHA-256)
    - Document registration on blockchain
    - Document verification
    - Version history tracking

Usage:
    from blockchain_service import BlockchainService

    blockchain = BlockchainService()

    # Hash a PDF document
    pdf_hash = blockchain.hash_document(pdf_bytes)

    # Register on blockchain
    tx_hash = blockchain.register_document(pdf_hash, ipfs_cid, doc_type)

    # Verify document
    result = blockchain.verify_document(pdf_hash)

Author: DocuGen Team
Date: 2025-12-28
"""

import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

from web3 import Web3
from web3.exceptions import ContractLogicError, TimeExhausted
from eth_account import Account

# Configure logging
logger = logging.getLogger(__name__)


class BlockchainServiceError(Exception):
    """Base exception for blockchain service errors"""
    pass


class BlockchainConnectionError(BlockchainServiceError):
    """Raised when unable to connect to blockchain"""
    pass


class ContractDeploymentError(BlockchainServiceError):
    """Raised when contract is not deployed or ABI not found"""
    pass


class TransactionError(BlockchainServiceError):
    """Raised when blockchain transaction fails"""
    pass


class BlockchainService:
    """
    Service for interacting with DocuGenRegistry smart contract on Polygon blockchain.

    This service handles:
    - Document hash generation
    - Blockchain registration
    - Document verification
    - Transaction management
    """

    def __init__(self):
        """
        Initialize blockchain service.

        Raises:
            BlockchainConnectionError: If unable to connect to blockchain
            ContractDeploymentError: If contract not deployed or ABI not found
        """
        # Load configuration from environment
        self.rpc_url = os.getenv('POLYGON_RPC_URL')
        self.contract_address = os.getenv('CONTRACT_ADDRESS')
        self.deployer_private_key = os.getenv('DEPLOYER_PRIVATE_KEY')
        self.chain_id = int(os.getenv('POLYGON_CHAIN_ID', '80001'))  # Default: Mumbai

        # Validate configuration
        if not self.rpc_url:
            raise BlockchainConnectionError("POLYGON_RPC_URL not set in environment")

        if not self.contract_address:
            raise ContractDeploymentError("CONTRACT_ADDRESS not set in environment")

        if not self.deployer_private_key:
            raise BlockchainConnectionError("DEPLOYER_PRIVATE_KEY not set in environment")

        # Initialize Web3
        try:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

            if not self.w3.is_connected():
                raise BlockchainConnectionError(f"Unable to connect to {self.rpc_url}")

            logger.info(f"Connected to blockchain: Chain ID {self.chain_id}")

        except Exception as e:
            raise BlockchainConnectionError(f"Web3 initialization failed: {e}")

        # Load deployer account
        try:
            self.account = Account.from_key(self.deployer_private_key)
            logger.info(f"Deployer account loaded: {self.account.address}")

        except Exception as e:
            raise BlockchainConnectionError(f"Failed to load deployer account: {e}")

        # Load contract ABI
        self.contract = self._load_contract()

    def _load_contract(self):
        """
        Load smart contract ABI and create contract instance.

        Returns:
            Contract: Web3 contract instance

        Raises:
            ContractDeploymentError: If ABI not found or contract not deployed
        """
        # Find ABI file
        project_root = Path(__file__).parent
        abi_path = project_root / "blockchain" / "abi" / "DocuGenRegistry.json"

        if not abi_path.exists():
            raise ContractDeploymentError(
                f"Contract ABI not found at {abi_path}. Run deployment script first."
            )

        # Load ABI
        try:
            with open(abi_path, 'r') as f:
                abi_data = json.load(f)

            contract_abi = abi_data.get('abi')
            if not contract_abi:
                raise ContractDeploymentError("Invalid ABI file format")

        except json.JSONDecodeError as e:
            raise ContractDeploymentError(f"Failed to parse ABI file: {e}")

        # Create contract instance
        try:
            # Convert address to checksum format
            contract_address = Web3.to_checksum_address(self.contract_address)

            contract = self.w3.eth.contract(
                address=contract_address,
                abi=contract_abi
            )

            logger.info(f"Contract loaded at: {contract_address}")
            return contract

        except Exception as e:
            raise ContractDeploymentError(f"Failed to load contract: {e}")

    def hash_document(self, pdf_bytes: bytes) -> str:
        """
        Generate SHA-256 hash of document.

        Args:
            pdf_bytes: Raw PDF file bytes

        Returns:
            str: Hex-encoded hash with '0x' prefix (66 chars total)

        Example:
            >>> pdf_bytes = b"PDF content here"
            >>> hash_value = blockchain.hash_document(pdf_bytes)
            >>> print(hash_value)
            '0x1234567890abcdef...'
        """
        if not pdf_bytes:
            raise ValueError("Document bytes cannot be empty")

        # Generate SHA-256 hash
        hash_digest = hashlib.sha256(pdf_bytes).hexdigest()

        # Return with 0x prefix
        return '0x' + hash_digest

    def register_document(
        self,
        document_hash: str,
        ipfs_cid: str,
        doc_type: str,
        gas_multiplier: float = 1.2
    ) -> str:
        """
        Register document on blockchain.

        Args:
            document_hash: SHA-256 hash of document (with 0x prefix)
            ipfs_cid: IPFS Content Identifier where encrypted document is stored
            doc_type: Type of document (e.g., "invoice", "receipt", "bank_statement")
            gas_multiplier: Multiplier for gas estimate (default 1.2 = 20% buffer)

        Returns:
            str: Transaction hash (with 0x prefix)

        Raises:
            TransactionError: If transaction fails
            ValueError: If parameters are invalid

        Example:
            >>> tx_hash = blockchain.register_document(
            ...     "0x1234...",
            ...     "QmXYZ123...",
            ...     "invoice"
            ... )
            >>> print(f"Transaction: {tx_hash}")
        """
        # Validate inputs
        if not document_hash or not document_hash.startswith('0x'):
            raise ValueError("Invalid document hash format")

        if not ipfs_cid:
            raise ValueError("IPFS CID cannot be empty")

        if not doc_type:
            raise ValueError("Document type cannot be empty")

        # Convert hash to bytes32
        try:
            doc_hash_bytes = bytes.fromhex(document_hash[2:])  # Remove 0x prefix
            if len(doc_hash_bytes) != 32:
                raise ValueError("Document hash must be 32 bytes (64 hex chars)")
        except ValueError as e:
            raise ValueError(f"Invalid document hash: {e}")

        try:
            # Get current nonce
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            # Get current gas price
            gas_price = self.w3.eth.gas_price

            # Estimate gas
            try:
                gas_estimate = self.contract.functions.registerDocument(
                    doc_hash_bytes,
                    ipfs_cid,
                    doc_type
                ).estimate_gas({'from': self.account.address})
            except ContractLogicError as e:
                # Check if document already exists
                if "Document already exists" in str(e):
                    raise TransactionError(f"Document already registered: {document_hash}")
                raise TransactionError(f"Contract error: {e}")

            # Add buffer to gas estimate
            gas_limit = int(gas_estimate * gas_multiplier)

            logger.info(f"Registering document: hash={document_hash[:10]}...")
            logger.info(f"  IPFS CID: {ipfs_cid}")
            logger.info(f"  Type: {doc_type}")
            logger.info(f"  Gas estimate: {gas_estimate:,}, limit: {gas_limit:,}")

            # Build transaction
            transaction = self.contract.functions.registerDocument(
                doc_hash_bytes,
                ipfs_cid,
                doc_type
            ).build_transaction({
                'chainId': self.chain_id,
                'from': self.account.address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': gas_price
            })

            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                self.deployer_private_key
            )

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            tx_hash_hex = tx_hash.hex()

            logger.info(f"Transaction sent: {tx_hash_hex}")

            # Wait for confirmation (with timeout)
            try:
                receipt = self.w3.eth.wait_for_transaction_receipt(
                    tx_hash,
                    timeout=300  # 5 minutes
                )

                if receipt['status'] == 1:
                    logger.info(f"✅ Document registered successfully!")
                    logger.info(f"  Block: {receipt['blockNumber']}")
                    logger.info(f"  Gas used: {receipt['gasUsed']:,}")
                    return tx_hash_hex
                else:
                    raise TransactionError(f"Transaction failed: {tx_hash_hex}")

            except TimeExhausted:
                logger.warning(f"Transaction confirmation timeout: {tx_hash_hex}")
                # Return tx hash anyway - user can check status later
                return tx_hash_hex

        except Exception as e:
            if isinstance(e, (TransactionError, ValueError)):
                raise
            raise TransactionError(f"Registration failed: {e}")

    def verify_document(self, document_hash: str) -> Optional[Dict[str, Any]]:
        """
        Verify document on blockchain and retrieve metadata.

        Args:
            document_hash: SHA-256 hash of document (with 0x prefix)

        Returns:
            dict: Document metadata if found, None if not found
                {
                    'ipfs_cid': str,
                    'doc_type': str,
                    'creator': str (address),
                    'timestamp': int (Unix timestamp),
                    'version_history': list of hashes
                }

        Example:
            >>> result = blockchain.verify_document("0x1234...")
            >>> if result:
            ...     print(f"Created by: {result['creator']}")
            ...     print(f"At: {datetime.fromtimestamp(result['timestamp'])}")
        """
        # Validate input
        if not document_hash or not document_hash.startswith('0x'):
            raise ValueError("Invalid document hash format")

        # Convert to bytes32
        try:
            doc_hash_bytes = bytes.fromhex(document_hash[2:])
            if len(doc_hash_bytes) != 32:
                raise ValueError("Document hash must be 32 bytes")
        except ValueError as e:
            raise ValueError(f"Invalid document hash: {e}")

        try:
            # Call contract view function
            result = self.contract.functions.getDocument(doc_hash_bytes).call()

            ipfs_cid, doc_type, creator, timestamp, version_history = result

            # Check if document exists (timestamp will be 0 if not found)
            if timestamp == 0:
                return None

            return {
                'ipfs_cid': ipfs_cid,
                'doc_type': doc_type,
                'creator': creator,
                'timestamp': timestamp,
                'version_history': [h.hex() for h in version_history],  # Convert bytes to hex
                'created_at': datetime.fromtimestamp(timestamp)
            }

        except ContractLogicError as e:
            # Document not found
            if "Document not found" in str(e):
                return None
            raise TransactionError(f"Contract error: {e}")

    def get_account_balance(self) -> float:
        """
        Get deployer account MATIC balance.

        Returns:
            float: Balance in MATIC
        """
        balance_wei = self.w3.eth.get_balance(self.account.address)
        return self.w3.from_wei(balance_wei, 'ether')

    def is_connected(self) -> bool:
        """
        Check if connected to blockchain.

        Returns:
            bool: True if connected
        """
        return self.w3.is_connected()

    def get_network_info(self) -> Dict[str, Any]:
        """
        Get blockchain network information.

        Returns:
            dict: Network details
        """
        return {
            'connected': self.is_connected(),
            'chain_id': self.chain_id,
            'rpc_url': self.rpc_url,
            'contract_address': self.contract_address,
            'deployer_address': self.account.address,
            'deployer_balance': self.get_account_balance()
        }


# Singleton instance (optional - for convenience)
_blockchain_instance = None


def get_blockchain_service() -> BlockchainService:
    """
    Get singleton blockchain service instance.

    Returns:
        BlockchainService: Initialized blockchain service

    Example:
        >>> blockchain = get_blockchain_service()
        >>> info = blockchain.get_network_info()
    """
    global _blockchain_instance

    if _blockchain_instance is None:
        _blockchain_instance = BlockchainService()

    return _blockchain_instance
