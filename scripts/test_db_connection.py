#!/usr/bin/env python3
"""
Test Supabase database connection.

Usage:
    python test_db_connection.py
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2

def main():
    # Load environment variables
    load_dotenv()

    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("Error: DATABASE_URL not found in .env file")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Testing Supabase Database Connection")
    print(f"{'='*60}\n")

    print(f"Database URL: {database_url.split('@')[1] if '@' in database_url else 'Invalid URL'}")
    print("\nAttempting to connect...")

    try:
        # Try to connect
        conn = psycopg2.connect(database_url)
        print("✓ Connection successful!\n")

        # Try a simple query
        cursor = conn.cursor()

        print("Testing basic query (SELECT version())...")
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✓ Query successful!")
        print(f"  Database version: {version}\n")

        # Check if tables exist
        print("Checking for required tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('packs', 'tracks')
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()

        if tables:
            print(f"✓ Found {len(tables)} required tables:")
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("✗ Warning: No packs or tracks tables found")

        print()

        # Count existing packs
        print("Counting existing packs...")
        cursor.execute("SELECT COUNT(*) FROM packs;")
        pack_count = cursor.fetchone()[0]
        print(f"✓ Found {pack_count} existing packs\n")

        # Close connection
        cursor.close()
        conn.close()

        print(f"{'='*60}")
        print("✓ All tests passed!")
        print(f"{'='*60}\n")

    except psycopg2.OperationalError as e:
        print(f"✗ Connection failed!")
        print(f"\nError: {e}\n")
        print("Possible issues:")
        print("  1. Database password is incorrect")
        print("  2. Database is paused (check Supabase dashboard)")
        print("  3. Network/firewall blocking connection")
        print("  4. Database host is incorrect")
        sys.exit(1)

    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
