import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.models.schemas import Case, InvestigatorNote, ConnectedEntitiesSummary, TransactionEvidence, EvidenceDetail, ScoreBreakdownItem

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated_data")
DEFAULT_DB_PATH = os.path.join(DB_DIR, "razorguard.db")


def get_db_path() -> str:
    return os.getenv("RAZORGUARD_DB_PATH", DEFAULT_DB_PATH)


class CaseStore:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or get_db_path()
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cases (
                    case_id TEXT PRIMARY KEY,
                    merchant_id TEXT NOT NULL,
                    merchant_name TEXT NOT NULL,
                    risk_score REAL NOT NULL,
                    risk_level TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    case_json TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS investigator_notes (
                    note_id TEXT PRIMARY KEY,
                    case_id TEXT NOT NULL,
                    note TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(case_id) REFERENCES cases(case_id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_merchant_id ON cases(merchant_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON cases(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_risk_level ON cases(risk_level)")
            conn.commit()

    def get_case(self, case_id: str) -> Optional[Case]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT case_json, status, updated_at FROM cases WHERE case_id = ?", (case_id,))
            row = cursor.fetchone()
            if not row:
                return None
            
            case_dict = json.loads(row["case_json"])
            case_dict["status"] = row["status"]
            case_dict["updated_at"] = row["updated_at"]

            # Load notes from notes table
            cursor.execute("SELECT note_id, case_id, note, created_at FROM investigator_notes WHERE case_id = ? ORDER BY created_at ASC", (case_id,))
            note_rows = cursor.fetchall()
            notes = [
                InvestigatorNote(
                    note_id=r["note_id"],
                    case_id=r["case_id"],
                    note=r["note"],
                    created_at=r["created_at"]
                ) for r in note_rows
            ]
            case_dict["investigator_notes"] = [n.model_dump() for n in notes]

            case = Case(**case_dict)
            return case

    def get_case_by_merchant_id(self, merchant_id: str) -> Optional[Case]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT case_id FROM cases WHERE merchant_id = ?", (merchant_id,))
            row = cursor.fetchone()
            if row:
                return self.get_case(row["case_id"])
            return None

    def save_case(self, case: Case) -> Case:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, created_at FROM cases WHERE case_id = ?", (case.case_id,))
            existing = cursor.fetchone()

            if existing:
                # Preserve existing status and created_at if already updated by investigator
                status = existing["status"]
                created_at = existing["created_at"]
            else:
                status = case.status
                created_at = case.created_at

            case.status = status
            case.created_at = created_at
            
            case_dict = case.model_dump()
            case_json = json.dumps(case_dict)

            cursor.execute("""
                INSERT INTO cases (case_id, merchant_id, merchant_name, risk_score, risk_level, status, created_at, updated_at, case_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(case_id) DO UPDATE SET
                    merchant_name=excluded.merchant_name,
                    risk_score=excluded.risk_score,
                    risk_level=excluded.risk_level,
                    updated_at=excluded.updated_at,
                    case_json=excluded.case_json
            """, (
                case.case_id,
                case.merchant_id,
                case.merchant_name,
                case.risk_score,
                case.risk_level,
                case.status,
                case.created_at,
                case.updated_at,
                case_json
            ))
            conn.commit()
        return self.get_case(case.case_id)

    def list_cases(
        self,
        status: Optional[str] = None,
        risk_level: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Case]:
        query = "SELECT case_id FROM cases WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status.upper())
        if risk_level:
            query += " AND risk_level = ?"
            params.append(risk_level.upper())

        query += " ORDER BY risk_score DESC"
        if limit and limit > 0:
            query += " LIMIT ?"
            params.append(limit)

        cases: List[Case] = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            for r in rows:
                c = self.get_case(r["case_id"])
                if c:
                    cases.append(c)

        return cases

    def update_case_status(self, case_id: str, new_status: str) -> Optional[Case]:
        now_str = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT case_json FROM cases WHERE case_id = ?", (case_id,))
            row = cursor.fetchone()
            if not row:
                return None

            cursor.execute("""
                UPDATE cases
                SET status = ?, updated_at = ?
                WHERE case_id = ?
            """, (new_status.upper(), now_str, case_id))
            conn.commit()

        return self.get_case(case_id)

    def add_case_note(self, case_id: str, note_text: str) -> Optional[InvestigatorNote]:
        now_str = datetime.now(timezone.utc).isoformat()
        note_id = f"NOTE-{uuid.uuid4().hex[:8].upper()}"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT case_id FROM cases WHERE case_id = ?", (case_id,))
            if not cursor.fetchone():
                return None

            cursor.execute("""
                INSERT INTO investigator_notes (note_id, case_id, note, created_at)
                VALUES (?, ?, ?, ?)
            """, (note_id, case_id, note_text, now_str))
            
            # Also update case updated_at timestamp
            cursor.execute("UPDATE cases SET updated_at = ? WHERE case_id = ?", (now_str, case_id))
            conn.commit()

        return InvestigatorNote(
            note_id=note_id,
            case_id=case_id,
            note=note_text,
            created_at=now_str
        )

    def clear_all(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM investigator_notes")
            cursor.execute("DELETE FROM cases")
            conn.commit()
