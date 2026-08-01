"""
Persistent Memory Engine - SQLite-based Long-term Memory
Extracted from AI-EcoSystem and adapted for Neural Nexus.
"""
import sqlite3
import json
import hashlib
import os
from datetime import datetime
from typing import List, Dict, Optional

class PersistentMemory:
    def __init__(self, db_path: str = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_dir = os.path.join(base_dir, "data", "memory_db")
            os.makedirs(db_dir, exist_ok=True)
            self.db_path = os.path.join(db_dir, "neural_nexus_memory.db")
        else:
            self.db_path = db_path
        self._init_database()

    def _init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                content_hash TEXT UNIQUE,
                importance INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 0,
                context TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memory_id INTEGER,
                tag TEXT NOT NULL,
                FOREIGN KEY (memory_id) REFERENCES memories (id) ON DELETE CASCADE
            )
        """)
        conn.commit()
        conn.close()

    def add_memory(self, content: str, tags: List[str] = None, importance: int = 5, context: str = "") -> str:
        if not content:
            return "Content is leeg."
        
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO memories (content, content_hash, importance, context)
                VALUES (?, ?, ?, ?)
            """, (content, content_hash, importance, context))
            memory_id = cursor.lastrowid
            
            if tags:
                for tag in tags:
                    cursor.execute("INSERT INTO tags (memory_id, tag) VALUES (?, ?)", (memory_id, tag))
            conn.commit()
            return f"Geheugen succesvol opgeslagen met ID: {memory_id}"
        except sqlite3.IntegrityError:
            cursor.execute("UPDATE memories SET access_count = access_count + 1, accessed_at = CURRENT_TIMESTAMP WHERE content_hash = ?", (content_hash,))
            conn.commit()
            return "Dit geheugen bestond al. Toegangsteller bijgewerkt."
        finally:
            conn.close()

    def search_memories(self, query: str = "", tag: str = None, limit: int = 10) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        sql = "SELECT m.* FROM memories m"
        params = []
        
        if tag:
            sql += " JOIN tags t ON m.id = t.memory_id WHERE t.tag = ?"
            params.append(tag)
            if query:
                sql += " AND m.content LIKE ?"
                params.append(f"%{query}%")
        elif query:
            sql += " WHERE m.content LIKE ?"
            params.append(f"%{query}%")
            
        sql += " ORDER BY m.importance DESC, m.accessed_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            cursor.execute("UPDATE memories SET access_count = access_count + 1, accessed_at = CURRENT_TIMESTAMP WHERE id = ?", (r["id"],))
            results.append(dict(r))
        conn.commit()
        conn.close()
        return results

if __name__ == "__main__":
    mem = PersistentMemory()
    mem.add_memory("Solana quant bot test initialisatie succesvol", tags=["system", "quant"], importance=8)
    res = mem.search_memories(tag="quant")
    assert len(res) > 0, "Memory search failed"
    print("[Fase 1.1] PersistentMemory Test: OK")
