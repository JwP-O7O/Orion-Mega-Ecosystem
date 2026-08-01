# Blockchain Integration - Week 1 Implementation Summary

## Overview

DocuGen now has blockchain infrastructure for document verification on Polygon blockchain! This implementation provides immutable provenance and cryptographic verification for all generated documents.

## What Was Implemented (Week 1-2)

### ✅ Smart Contract
- **File**: `blockchain/contracts/DocuGenRegistry.sol`
- **Features**:
  - Document registration with hash, IPFS CID, and type
  - Document verification (check if registered)
  - Version history tracking for document updates
  - Event emissions for off-chain indexing
  - Creator-only update permissions

### ✅ Deployment Infrastructure
- **Deployment Script**: `blockchain/scripts/deploy.py`
  - Compiles Solidity contract
  - Deploys to Polygon Mumbai (testnet) or Mainnet
  - Saves ABI and deployment info
  - Estimates gas costs

- **Contract Tests**: `blockchain/scripts/test_contract.py`
  - Unit tests for all contract functions
  - Tests duplicate prevention
  - Tests version history
  - Tests permissions

### ✅ Backend Integration
- **Blockchain Service**: `blockchain_service.py`
  - Web3.py integration
  - Document hash generation (SHA-256)
  - Blockchain registration
  - Document verification
  - Error handling and logging

### ✅ Database Updates
- **New Document Model Fields**:
  - `blockchain_hash`: SHA-256 hash (0x + 64 hex chars)
  - `blockchain_tx`: Transaction hash
  - `ipfs_cid`: IPFS Content Identifier
  - `blockchain_verified`: Registration status
  - `blockchain_timestamp`: Registration time

- **Migration Script**: `migrations/add_blockchain_fields.py`
  - Adds blockchain fields to existing database
  - Works with SQLite and PostgreSQL
  - Idempotent (can run multiple times safely)

### ✅ Dependencies Added
```
web3==6.11.3              # Ethereum/Polygon interaction
py-solc-x==2.0.2          # Solidity compiler
eth-account==0.10.0       # Account management
cryptography==41.0.7      # AES-256 encryption
pinata-py==0.2.0          # IPFS pinning
requests==2.31.0          # HTTP requests
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Solidity compiler (for deployment)
npm install -g solc
```

### 2. Get Blockchain Access

**Option A: Polygon Mumbai Testnet (Recommended for testing)**

1. Sign up at [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/)
2. Create a new app for Polygon Mumbai
3. Copy the RPC URL

**Option B: Polygon Mainnet (Production)**

1. Same as above, but select Polygon Mainnet
2. You'll need real MATIC tokens for gas fees

### 3. Create Deployer Wallet

```bash
# Generate a new Ethereum account
python -c "from eth_account import Account; acc = Account.create(); print(f'Address: {acc.address}\nPrivate Key: {acc.key.hex()}')"
```

**Important**: Save the private key securely! Never commit it to git!

For testnet, get free MATIC from: https://faucet.polygon.technology/

### 4. Configure Environment

Copy `.env.example` to `.env` and update:

```env
# Blockchain Configuration
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
CONTRACT_ADDRESS=  # Leave empty until deployed
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
POLYGON_CHAIN_ID=80001  # 80001 for Mumbai, 137 for Mainnet

# IPFS Configuration (for Week 3-4)
PINATA_API_KEY=your-key-here
PINATA_SECRET_KEY=your-secret-here

# Document Encryption (for Week 3-4)
DOCUMENT_ENCRYPTION_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

### 5. Deploy Smart Contract

```bash
# Test on Mumbai testnet first
python blockchain/scripts/deploy.py --network mumbai

# For production (requires real MATIC)
python blockchain/scripts/deploy.py --network mainnet
```

After deployment, copy the contract address to your `.env` file:
```env
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### 6. Run Database Migration

```bash
python migrations/add_blockchain_fields.py
```

### 7. Test the Integration

```bash
# Run contract tests
python blockchain/scripts/test_contract.py

# Test blockchain service (Python shell)
python -c "
from blockchain_service import BlockchainService
blockchain = BlockchainService()
print(blockchain.get_network_info())
"
```

## Usage Examples

### Hash a Document

```python
from blockchain_service import BlockchainService

blockchain = BlockchainService()

# Hash PDF bytes
with open('document.pdf', 'rb') as f:
    pdf_bytes = f.read()

doc_hash = blockchain.hash_document(pdf_bytes)
print(f"Document hash: {doc_hash}")
# Output: 0x1234567890abcdef...
```

### Register Document on Blockchain

```python
from blockchain_service import BlockchainService

blockchain = BlockchainService()

# Register document
tx_hash = blockchain.register_document(
    document_hash="0x1234...",
    ipfs_cid="QmXYZ123...",
    doc_type="invoice"
)

print(f"Transaction: {tx_hash}")
# Output: 0xabcdef1234567890...
```

### Verify Document

```python
from blockchain_service import BlockchainService

blockchain = BlockchainService()

# Verify document
result = blockchain.verify_document("0x1234...")

if result:
    print(f"✅ Document verified!")
    print(f"   Created by: {result['creator']}")
    print(f"   Timestamp: {result['created_at']}")
    print(f"   IPFS: {result['ipfs_cid']}")
else:
    print("❌ Document not found on blockchain")
```

## Architecture

### Document Registration Flow

```
1. User generates document in DocuGen
   ↓
2. PDF created (existing ReportLab logic)
   ↓
3. Hash document (SHA-256)
   ↓
4. [Week 3-4] Encrypt + Upload to IPFS
   ↓
5. Register hash + IPFS CID on blockchain
   ↓
6. Store blockchain TX hash in database
   ↓
7. User sees: "Document verified on blockchain!"
```

### Smart Contract Functions

| Function | Description | Access |
|----------|-------------|--------|
| `registerDocument()` | Register new document | Public |
| `getDocument()` | Get document metadata | Public (view) |
| `verifyDocument()` | Check if document exists | Public (view) |
| `updateDocument()` | Create new version | Creator only |
| `getVersionHistory()` | Get all versions | Public (view) |

### Gas Costs (Polygon Mumbai/Mainnet)

| Operation | Gas Used | Cost (Mainnet)* |
|-----------|----------|-----------------|
| Register Document | ~150,000 | ~$0.03 |
| Update Document | ~180,000 | ~$0.04 |
| Verify Document | 0 (view) | Free |

*Estimated at $0.80 MATIC and 30 Gwei gas price

## File Structure

```
DocuGen/
├── blockchain/
│   ├── contracts/
│   │   └── DocuGenRegistry.sol       # Smart contract
│   ├── scripts/
│   │   ├── deploy.py                 # Deployment script
│   │   └── test_contract.py          # Contract tests
│   └── abi/
│       └── DocuGenRegistry.json      # Contract ABI (generated)
│
├── blockchain_service.py              # Web3 integration
├── migrations/
│   └── add_blockchain_fields.py      # Database migration
│
├── .env.example                       # Updated with blockchain config
└── requirements.txt                   # Updated dependencies
```

## Testing

### Run Smart Contract Tests

```bash
python blockchain/scripts/test_contract.py
```

Expected output:
```
✅ Test: Register Document
✅ Test: Prevent Duplicate Registration
✅ Test: Verify Document
✅ Test: Update Document
✅ Test: Update Permission Check
✅ Test: Total Document Count
✅ Test: Creator Check

Test Results: 7 passed, 0 failed
```

### Check Blockchain Connection

```python
from blockchain_service import BlockchainService

blockchain = BlockchainService()
info = blockchain.get_network_info()

print(f"Connected: {info['connected']}")
print(f"Chain ID: {info['chain_id']}")
print(f"Contract: {info['contract_address']}")
print(f"Balance: {info['deployer_balance']} MATIC")
```

## Security Considerations

### ✅ What We Secured

1. **Immutability**: Documents registered on blockchain cannot be altered
2. **Provenance**: Cryptographic proof of document creation time and creator
3. **Duplicate Prevention**: Same document cannot be registered twice
4. **Version History**: Full audit trail of document updates
5. **Permission Control**: Only creator can update documents

### ⚠️ What's NOT Yet Implemented (Week 3-4)

1. **Document Encryption**: Currently documents are not encrypted before IPFS upload
2. **IPFS Integration**: Not yet storing documents on IPFS
3. **Zero-Knowledge Proofs**: Privacy features coming in Week 5-6

### 🔒 Private Key Security

**CRITICAL**: Never expose your private key!

- ✅ Store in `.env` file (gitignored)
- ✅ Use environment variables in production
- ✅ For production, use AWS KMS or HashiCorp Vault
- ❌ Never commit to git
- ❌ Never share in logs or error messages

## Troubleshooting

### Issue: "Unable to connect to blockchain"

**Solution**: Check your RPC URL in `.env`:
```bash
# Test connection
curl -X POST $POLYGON_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Issue: "Contract not deployed"

**Solution**: Deploy the contract first:
```bash
python blockchain/scripts/deploy.py --network mumbai
```

### Issue: "Insufficient funds for gas"

**Solution**:
- **Testnet**: Get free MATIC from https://faucet.polygon.technology/
- **Mainnet**: Send MATIC to your deployer address

### Issue: "Transaction failed: Document already exists"

**Solution**: Each document hash can only be registered once. If you regenerate the same document, it will have the same hash.

## Next Steps (Week 3-4)

1. **IPFS Integration**:
   - Set up Pinata account
   - Implement document encryption (AES-256)
   - Upload encrypted documents to IPFS
   - Integrate with document generation flow

2. **Update `download_document` route**:
   - Trigger blockchain registration automatically
   - Handle async registration (don't block downloads)
   - Add retry logic for failed registrations

3. **Frontend Updates**:
   - Add "Verify on Blockchain" button
   - Show blockchain verification status
   - Display transaction links to Polygonscan

## Resources

- **Polygon Mumbai Explorer**: https://mumbai.polygonscan.com/
- **Polygon Mainnet Explorer**: https://polygonscan.com/
- **Testnet Faucet**: https://faucet.polygon.technology/
- **Alchemy Dashboard**: https://dashboard.alchemy.com/
- **Web3.py Docs**: https://web3py.readthedocs.io/

## Support

For issues or questions:
- Check logs in `logs/docugen.log`
- Review smart contract on Polygonscan
- Test with `blockchain/scripts/test_contract.py`

## License

MIT License - See LICENSE file

---

**Status**: ✅ Week 1-2 Complete (Blockchain Infrastructure)
**Next**: Week 3-4 (IPFS Integration & Encryption)
**Timeline**: 8 weeks total to revolutionary blockchain + ZKP platform
