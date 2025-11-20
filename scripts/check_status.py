from utils.db import get_db_connection
from dotenv import load_dotenv

load_dotenv()
with get_db_connection() as conn:
    cursor = conn.cursor()
    cursor.execute(
        """SELECT COUNT(release_year) as enriched FROM tracks WHERE
pack_id = (SELECT id FROM packs WHERE name LIKE '%Every Track Star%' LIMIT
1)"""
    )
    print(f"Enriched: {cursor.fetchone()[0]}/3159 tracks")
