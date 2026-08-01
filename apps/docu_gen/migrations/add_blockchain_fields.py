#!/usr/bin/env python3
"""
Database Migration: Add Blockchain Fields to Document Model

This migration adds blockchain-related fields to the Document table:
- blockchain_hash: SHA-256 hash of document (0x + 64 hex chars)
- blockchain_tx: Transaction hash on blockchain
- ipfs_cid: IPFS Content Identifier
- blockchain_verified: Boolean flag for registration status
- blockchain_timestamp: When document was registered on blockchain

Usage:
    python migrations/add_blockchain_fields.py

Requirements:
    - Flask app must be running or app context must be available
    - SQLite/PostgreSQL database must be accessible

Author: DocuGen Team
Date: 2025-12-28
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app, db
from sqlalchemy import text


def check_column_exists(table_name, column_name):
    """
    Check if column exists in table.

    Args:
        table_name: Name of the table
        column_name: Name of the column

    Returns:
        bool: True if column exists
    """
    with db.engine.connect() as conn:
        # Get database type
        db_type = db.engine.dialect.name

        if db_type == 'sqlite':
            # SQLite: Use PRAGMA table_info
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            columns = [row[1] for row in result]
            return column_name in columns

        elif db_type == 'postgresql':
            # PostgreSQL: Query information_schema
            query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :table_name
                AND column_name = :column_name
            """)
            result = conn.execute(query, {
                'table_name': table_name,
                'column_name': column_name
            })
            return result.fetchone() is not None

        else:
            # For other databases, try to query
            try:
                conn.execute(text(f"SELECT {column_name} FROM {table_name} LIMIT 1"))
                return True
            except Exception:
                return False


def add_blockchain_fields():
    """
    Add blockchain fields to Document table.

    This function checks if each field exists before adding it to avoid errors.
    """
    print("=" * 60)
    print("  Database Migration: Add Blockchain Fields")
    print("=" * 60)

    # Get database type
    db_type = db.engine.dialect.name
    print(f"\nDatabase: {db_type}")
    print(f"Location: {db.engine.url}\n")

    # Define fields to add
    fields = [
        {
            'name': 'blockchain_hash',
            'type': 'VARCHAR(66)',
            'description': 'SHA-256 hash of document (0x + 64 hex chars)'
        },
        {
            'name': 'blockchain_tx',
            'type': 'VARCHAR(66)',
            'description': 'Transaction hash on blockchain'
        },
        {
            'name': 'ipfs_cid',
            'type': 'VARCHAR(100)',
            'description': 'IPFS Content Identifier'
        },
        {
            'name': 'blockchain_verified',
            'type': 'BOOLEAN DEFAULT 0' if db_type == 'sqlite' else 'BOOLEAN DEFAULT FALSE',
            'description': 'Registration status'
        },
        {
            'name': 'blockchain_timestamp',
            'type': 'DATETIME',
            'description': 'When registered on blockchain'
        }
    ]

    # Add each field
    added_count = 0
    skipped_count = 0

    with db.engine.connect() as conn:
        trans = conn.begin()

        try:
            for field in fields:
                field_name = field['name']
                field_type = field['type']
                description = field['description']

                # Check if field already exists
                if check_column_exists('document', field_name):
                    print(f"⏭️  Skipped: {field_name} (already exists)")
                    skipped_count += 1
                    continue

                # Add column
                print(f"➕ Adding: {field_name} ({description})")

                alter_query = f"""
                    ALTER TABLE document
                    ADD COLUMN {field_name} {field_type}
                """

                conn.execute(text(alter_query))
                added_count += 1
                print(f"   ✅ Added successfully")

            # Commit transaction
            trans.commit()
            print("\n" + "=" * 60)
            print(f"  Migration Complete!")
            print(f"  Added: {added_count} fields")
            print(f"  Skipped: {skipped_count} fields")
            print("=" * 60)

        except Exception as e:
            # Rollback on error
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise


def verify_migration():
    """
    Verify that all blockchain fields were added successfully.
    """
    print("\n🔍 Verifying migration...")

    required_fields = [
        'blockchain_hash',
        'blockchain_tx',
        'ipfs_cid',
        'blockchain_verified',
        'blockchain_timestamp'
    ]

    all_present = True

    for field in required_fields:
        exists = check_column_exists('document', field)

        if exists:
            print(f"   ✅ {field}: Present")
        else:
            print(f"   ❌ {field}: Missing")
            all_present = False

    if all_present:
        print("\n✅ All blockchain fields present!")
        return True
    else:
        print("\n❌ Some fields are missing!")
        return False


def main():
    """Main entry point"""
    print("\nInitializing migration...\n")

    # Create app context
    with app.app_context():
        try:
            # Run migration
            add_blockchain_fields()

            # Verify
            success = verify_migration()

            if success:
                print("\n🎉 Migration completed successfully!")
                print("\nNext steps:")
                print("1. Update your .env with blockchain configuration")
                print("2. Deploy smart contract: python blockchain/scripts/deploy.py")
                print("3. Test blockchain integration")
                sys.exit(0)
            else:
                print("\n⚠️  Migration incomplete!")
                sys.exit(1)

        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
