#!/usr/bin/env python3
"""
DocuGen Smart Contract Deployment Script

This script compiles and deploys the DocuGenRegistry smart contract to Polygon blockchain.
Supports both testnet (Mumbai) and mainnet deployments.

Usage:
    python deploy.py --network mumbai   # Deploy to testnet
    python deploy.py --network mainnet  # Deploy to mainnet (production)

Requirements:
    - Python 3.8+
    - web3.py
    - py-solc-x
    - Environment variables: POLYGON_RPC_URL, DEPLOYER_PRIVATE_KEY
"""

import os
import json
import sys
import time
from pathlib import Path
from web3 import Web3
from eth_account import Account
from solcx import compile_source, install_solc, set_solc_version

# Configure paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
CONTRACT_PATH = PROJECT_ROOT / "blockchain" / "contracts" / "DocuGenRegistry.sol"
ABI_OUTPUT_PATH = PROJECT_ROOT / "blockchain" / "abi" / "DocuGenRegistry.json"

# Network configurations
NETWORKS = {
    "mumbai": {
        "name": "Polygon Mumbai Testnet",
        "rpc_url": os.getenv("POLYGON_MUMBAI_RPC_URL", "https://rpc-mumbai.maticvigil.com"),
        "chain_id": 80001,
        "explorer": "https://mumbai.polygonscan.com"
    },
    "mainnet": {
        "name": "Polygon Mainnet",
        "rpc_url": os.getenv("POLYGON_RPC_URL", "https://polygon-rpc.com"),
        "chain_id": 137,
        "explorer": "https://polygonscan.com"
    }
}


class ContractDeployer:
    """Handles smart contract compilation and deployment"""

    def __init__(self, network="mumbai"):
        """
        Initialize deployer

        Args:
            network: Network to deploy to ("mumbai" or "mainnet")
        """
        if network not in NETWORKS:
            raise ValueError(f"Invalid network: {network}. Choose 'mumbai' or 'mainnet'")

        self.network_config = NETWORKS[network]
        self.network_name = network

        # Initialize Web3
        rpc_url = self.network_config["rpc_url"]
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to {self.network_config['name']}")

        print(f"✅ Connected to {self.network_config['name']}")
        print(f"   RPC: {rpc_url}")
        print(f"   Chain ID: {self.network_config['chain_id']}")

        # Load deployer account
        private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
        if not private_key:
            raise ValueError("DEPLOYER_PRIVATE_KEY environment variable not set")

        self.account = Account.from_key(private_key)
        print(f"   Deployer: {self.account.address}")

        # Check balance
        balance = self.w3.eth.get_balance(self.account.address)
        balance_matic = self.w3.from_wei(balance, 'ether')
        print(f"   Balance: {balance_matic:.4f} MATIC")

        if balance == 0:
            print("⚠️  WARNING: Deployer account has 0 balance!")
            if network == "mumbai":
                print("   Get testnet MATIC from: https://faucet.polygon.technology/")

    def compile_contract(self):
        """
        Compile Solidity smart contract

        Returns:
            dict: Compiled contract data (bytecode, ABI)
        """
        print("\n📝 Compiling smart contract...")

        # Read contract source
        with open(CONTRACT_PATH, 'r') as f:
            contract_source = f.read()

        # Install and set Solidity compiler version
        print("   Installing Solidity compiler v0.8.19...")
        install_solc('0.8.19')
        set_solc_version('0.8.19')

        # Compile contract
        print("   Compiling DocuGenRegistry.sol...")
        compiled_sol = compile_source(
            contract_source,
            output_values=['abi', 'bin'],
            solc_version='0.8.19'
        )

        # Extract contract interface
        contract_id, contract_interface = compiled_sol.popitem()

        print(f"✅ Contract compiled successfully")
        print(f"   Contract ID: {contract_id}")

        return contract_interface

    def deploy_contract(self, contract_interface):
        """
        Deploy compiled contract to blockchain

        Args:
            contract_interface: Compiled contract data

        Returns:
            tuple: (contract_address, transaction_hash)
        """
        print("\n🚀 Deploying contract to blockchain...")

        # Create contract object
        Contract = self.w3.eth.contract(
            abi=contract_interface['abi'],
            bytecode=contract_interface['bin']
        )

        # Get current nonce
        nonce = self.w3.eth.get_transaction_count(self.account.address)

        # Get current gas price
        gas_price = self.w3.eth.gas_price

        # Estimate gas
        try:
            gas_estimate = Contract.constructor().estimate_gas({
                'from': self.account.address
            })
        except Exception as e:
            print(f"⚠️  Gas estimation failed: {e}")
            gas_estimate = 3000000  # Fallback

        print(f"   Gas estimate: {gas_estimate:,}")
        print(f"   Gas price: {self.w3.from_wei(gas_price, 'gwei'):.2f} Gwei")

        # Calculate deployment cost
        deployment_cost = gas_estimate * gas_price
        deployment_cost_matic = self.w3.from_wei(deployment_cost, 'ether')
        print(f"   Estimated cost: {deployment_cost_matic:.6f} MATIC")

        # Build transaction
        transaction = Contract.constructor().build_transaction({
            'chainId': self.network_config['chain_id'],
            'from': self.account.address,
            'nonce': nonce,
            'gas': gas_estimate + 100000,  # Add buffer
            'gasPrice': gas_price
        })

        # Sign transaction
        print("   Signing transaction...")
        signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)

        # Send transaction
        print("   Sending transaction...")
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        print(f"   Transaction hash: {tx_hash.hex()}")

        # Wait for confirmation
        print("   Waiting for confirmation...")
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)

        if tx_receipt['status'] == 1:
            contract_address = tx_receipt['contractAddress']
            print(f"\n✅ Contract deployed successfully!")
            print(f"   Address: {contract_address}")
            print(f"   Block: {tx_receipt['blockNumber']}")
            print(f"   Gas used: {tx_receipt['gasUsed']:,}")
            print(f"   Explorer: {self.network_config['explorer']}/address/{contract_address}")

            return contract_address, tx_hash.hex()
        else:
            raise Exception("Contract deployment failed")

    def save_deployment_info(self, contract_interface, contract_address, tx_hash):
        """
        Save deployment information to JSON files

        Args:
            contract_interface: Compiled contract data
            contract_address: Deployed contract address
            tx_hash: Deployment transaction hash
        """
        print("\n💾 Saving deployment information...")

        # Save ABI
        abi_data = {
            "contractName": "DocuGenRegistry",
            "abi": contract_interface['abi'],
            "networks": {
                str(self.network_config['chain_id']): {
                    "address": contract_address,
                    "transactionHash": tx_hash
                }
            }
        }

        with open(ABI_OUTPUT_PATH, 'w') as f:
            json.dump(abi_data, f, indent=2)

        print(f"   ABI saved to: {ABI_OUTPUT_PATH}")

        # Save deployment config
        deployment_config = {
            "network": self.network_name,
            "networkName": self.network_config['name'],
            "chainId": self.network_config['chain_id'],
            "contractAddress": contract_address,
            "deploymentTx": tx_hash,
            "deployer": self.account.address,
            "deploymentTime": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "explorerUrl": f"{self.network_config['explorer']}/address/{contract_address}"
        }

        deployment_file = PROJECT_ROOT / "blockchain" / f"deployment_{self.network_name}.json"
        with open(deployment_file, 'w') as f:
            json.dump(deployment_config, f, indent=2)

        print(f"   Deployment config saved to: {deployment_file}")

        # Print environment variable
        print("\n📋 Add this to your .env file:")
        print(f"   CONTRACT_ADDRESS={contract_address}")
        print(f"   POLYGON_RPC_URL={self.network_config['rpc_url']}")

    def run(self):
        """Execute full deployment process"""
        try:
            # Compile
            contract_interface = self.compile_contract()

            # Confirm deployment
            if self.network_name == "mainnet":
                confirm = input("\n⚠️  Deploy to MAINNET? This will cost real MATIC! (yes/no): ")
                if confirm.lower() != "yes":
                    print("Deployment cancelled.")
                    return

            # Deploy
            contract_address, tx_hash = self.deploy_contract(contract_interface)

            # Save info
            self.save_deployment_info(contract_interface, contract_address, tx_hash)

            print("\n🎉 Deployment complete!")

        except Exception as e:
            print(f"\n❌ Deployment failed: {e}")
            sys.exit(1)


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Deploy DocuGen smart contract")
    parser.add_argument(
        "--network",
        choices=["mumbai", "mainnet"],
        default="mumbai",
        help="Network to deploy to (default: mumbai)"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("   DocuGen Smart Contract Deployment")
    print("=" * 60)

    deployer = ContractDeployer(network=args.network)
    deployer.run()


if __name__ == "__main__":
    main()
