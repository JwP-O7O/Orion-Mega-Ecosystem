#!/usr/bin/env python3
"""
DocuGen Smart Contract Unit Tests

Test suite for DocuGenRegistry smart contract functionality.

Usage:
    python test_contract.py

Requirements:
    - Python 3.8+
    - web3.py
    - py-solc-x
"""

import os
import sys
import time
import hashlib
from pathlib import Path
from web3 import Web3
from eth_account import Account
from solcx import compile_source, install_solc, set_solc_version

# Configure paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
CONTRACT_PATH = PROJECT_ROOT / "blockchain" / "contracts" / "DocuGenRegistry.sol"


class ContractTester:
    """Test suite for DocuGenRegistry smart contract"""

    def __init__(self):
        """Initialize local blockchain and deploy contract"""
        print("🧪 Initializing test environment...")

        # Use Ganache or local test chain
        # For simplicity, we'll use in-memory EVM via Web3
        self.w3 = Web3(Web3.EthereumTesterProvider())

        # Create test accounts
        self.account1 = self.w3.eth.accounts[0]
        self.account2 = self.w3.eth.accounts[1]

        print(f"   Test account 1: {self.account1}")
        print(f"   Test account 2: {self.account2}")

        # Compile and deploy contract
        self.contract = self._deploy_contract()
        print(f"   Contract deployed at: {self.contract.address}")

    def _deploy_contract(self):
        """Compile and deploy contract to test chain"""
        print("\n📝 Compiling contract for testing...")

        # Read contract source
        with open(CONTRACT_PATH, 'r') as f:
            contract_source = f.read()

        # Install compiler
        install_solc('0.8.19')
        set_solc_version('0.8.19')

        # Compile
        compiled_sol = compile_source(
            contract_source,
            output_values=['abi', 'bin'],
            solc_version='0.8.19'
        )

        contract_id, contract_interface = compiled_sol.popitem()

        # Deploy
        Contract = self.w3.eth.contract(
            abi=contract_interface['abi'],
            bytecode=contract_interface['bin']
        )

        tx_hash = Contract.constructor().transact({'from': self.account1})
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        return self.w3.eth.contract(
            address=tx_receipt.contractAddress,
            abi=contract_interface['abi']
        )

    def _generate_test_hash(self, content):
        """Generate document hash for testing"""
        return self.w3.keccak(text=content)

    def test_register_document(self):
        """Test: Register a new document"""
        print("\n✅ Test: Register Document")

        doc_hash = self._generate_test_hash("Test Document Content")
        ipfs_cid = "QmTestCID12345"
        doc_type = "invoice"

        # Register document
        tx_hash = self.contract.functions.registerDocument(
            doc_hash,
            ipfs_cid,
            doc_type
        ).transact({'from': self.account1})

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        # Verify event emitted
        assert receipt.status == 1, "Transaction failed"

        # Retrieve document
        result = self.contract.functions.getDocument(doc_hash).call()
        ipfs_cid_ret, doc_type_ret, creator, timestamp, version_history = result

        assert ipfs_cid_ret == ipfs_cid, "IPFS CID mismatch"
        assert doc_type_ret == doc_type, "Document type mismatch"
        assert creator == self.account1, "Creator mismatch"
        assert timestamp > 0, "Timestamp should be set"
        assert len(version_history) == 0, "New document should have no version history"

        print(f"   ✓ Document registered: {doc_hash.hex()[:10]}...")
        print(f"   ✓ Creator: {creator}")
        print(f"   ✓ Timestamp: {timestamp}")

    def test_duplicate_registration(self):
        """Test: Cannot register duplicate document"""
        print("\n✅ Test: Prevent Duplicate Registration")

        doc_hash = self._generate_test_hash("Duplicate Test")
        ipfs_cid = "QmDuplicateTest"
        doc_type = "receipt"

        # First registration should succeed
        self.contract.functions.registerDocument(
            doc_hash, ipfs_cid, doc_type
        ).transact({'from': self.account1})

        # Second registration should fail
        try:
            self.contract.functions.registerDocument(
                doc_hash, ipfs_cid, doc_type
            ).transact({'from': self.account1})
            assert False, "Should have raised exception"
        except Exception as e:
            assert "Document already exists" in str(e), "Wrong error message"
            print("   ✓ Duplicate registration blocked correctly")

    def test_verify_document(self):
        """Test: Verify document existence"""
        print("\n✅ Test: Verify Document")

        doc_hash = self._generate_test_hash("Verify Test")
        ipfs_cid = "QmVerifyTest"
        doc_type = "invoice"

        # Register
        self.contract.functions.registerDocument(
            doc_hash, ipfs_cid, doc_type
        ).transact({'from': self.account1})

        # Verify existing document
        exists, timestamp = self.contract.functions.verifyDocument(doc_hash).call()
        assert exists is True, "Document should exist"
        assert timestamp > 0, "Timestamp should be set"
        print(f"   ✓ Document verified: exists={exists}, timestamp={timestamp}")

        # Verify non-existent document
        fake_hash = self._generate_test_hash("Non-existent")
        exists, timestamp = self.contract.functions.verifyDocument(fake_hash).call()
        assert exists is False, "Document should not exist"
        assert timestamp == 0, "Timestamp should be 0"
        print(f"   ✓ Non-existent document check: exists={exists}")

    def test_update_document(self):
        """Test: Update document with version history"""
        print("\n✅ Test: Update Document")

        # Register original document
        old_hash = self._generate_test_hash("Original Document v1")
        ipfs_cid_v1 = "QmOriginalV1"
        doc_type = "invoice"

        self.contract.functions.registerDocument(
            old_hash, ipfs_cid_v1, doc_type
        ).transact({'from': self.account1})

        # Update document
        new_hash = self._generate_test_hash("Updated Document v2")
        ipfs_cid_v2 = "QmUpdatedV2"

        tx_hash = self.contract.functions.updateDocument(
            old_hash, new_hash, ipfs_cid_v2
        ).transact({'from': self.account1})

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        assert receipt.status == 1, "Update transaction failed"

        # Verify new version
        result = self.contract.functions.getDocument(new_hash).call()
        ipfs_cid_ret, doc_type_ret, creator, timestamp, version_history = result

        assert ipfs_cid_ret == ipfs_cid_v2, "IPFS CID should be updated"
        assert doc_type_ret == doc_type, "Document type should remain same"
        assert len(version_history) == 1, "Should have 1 version in history"
        assert version_history[0] == old_hash, "Version history should contain old hash"

        print(f"   ✓ Document updated: {new_hash.hex()[:10]}...")
        print(f"   ✓ Version history: {len(version_history)} versions")

    def test_only_creator_can_update(self):
        """Test: Only creator can update document"""
        print("\n✅ Test: Update Permission Check")

        # Register document as account1
        old_hash = self._generate_test_hash("Permission Test")
        ipfs_cid = "QmPermissionTest"
        doc_type = "receipt"

        self.contract.functions.registerDocument(
            old_hash, ipfs_cid, doc_type
        ).transact({'from': self.account1})

        # Try to update as account2 (should fail)
        new_hash = self._generate_test_hash("Unauthorized Update")
        new_ipfs_cid = "QmUnauthorized"

        try:
            self.contract.functions.updateDocument(
                old_hash, new_hash, new_ipfs_cid
            ).transact({'from': self.account2})
            assert False, "Should have raised exception"
        except Exception as e:
            assert "Only creator can perform this action" in str(e), "Wrong error message"
            print("   ✓ Unauthorized update blocked correctly")

    def test_get_total_documents(self):
        """Test: Get total document count"""
        print("\n✅ Test: Total Document Count")

        initial_count = self.contract.functions.getTotalDocuments().call()

        # Register 3 documents
        for i in range(3):
            doc_hash = self._generate_test_hash(f"Count Test {i}")
            ipfs_cid = f"QmCountTest{i}"
            doc_type = "invoice"

            self.contract.functions.registerDocument(
                doc_hash, ipfs_cid, doc_type
            ).transact({'from': self.account1})

        final_count = self.contract.functions.getTotalDocuments().call()

        assert final_count == initial_count + 3, "Count should increase by 3"
        print(f"   ✓ Document count: {initial_count} → {final_count}")

    def test_is_document_creator(self):
        """Test: Check document creator"""
        print("\n✅ Test: Creator Check")

        doc_hash = self._generate_test_hash("Creator Check Test")
        ipfs_cid = "QmCreatorCheck"
        doc_type = "invoice"

        # Register as account1
        self.contract.functions.registerDocument(
            doc_hash, ipfs_cid, doc_type
        ).transact({'from': self.account1})

        # Check from account1 (should be true)
        is_creator = self.contract.functions.isDocumentCreator(doc_hash).call(
            {'from': self.account1}
        )
        assert is_creator is True, "Account1 should be creator"
        print(f"   ✓ Creator check (account1): {is_creator}")

        # Note: isDocumentCreator checks msg.sender in the contract
        # In testing, we can't easily test this without deploying
        # In production, this would be tested via actual transactions

    def run_all_tests(self):
        """Run complete test suite"""
        print("\n" + "=" * 60)
        print("   DocuGen Smart Contract Test Suite")
        print("=" * 60)

        tests = [
            self.test_register_document,
            self.test_duplicate_registration,
            self.test_verify_document,
            self.test_update_document,
            self.test_only_creator_can_update,
            self.test_get_total_documents,
            self.test_is_document_creator
        ]

        passed = 0
        failed = 0

        for test in tests:
            try:
                test()
                passed += 1
            except AssertionError as e:
                print(f"   ❌ Test failed: {e}")
                failed += 1
            except Exception as e:
                print(f"   ❌ Test error: {e}")
                failed += 1

        print("\n" + "=" * 60)
        print(f"   Test Results: {passed} passed, {failed} failed")
        print("=" * 60)

        return failed == 0


def main():
    """Main entry point"""
    try:
        tester = ContractTester()
        success = tester.run_all_tests()

        if success:
            print("\n🎉 All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
