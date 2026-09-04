import os
import logging
from urllib.parse import quote
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

logger = logging.getLogger("razorguard.firebase")


class FirebaseService:
    """
    Dedicated Firebase Initialization Service.
    Initializes Firebase Admin SDK exactly once, manages Firestore client,
    verifies active Cloud Firestore connectivity, and supports graceful local fallback.
    """
    _instance = None
    _db = None
    _is_connected = False
    _status_msg = "disconnected (local fallback mode)"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseService, cls).__new__(cls)
            cls._instance._initialize_firebase()
        return cls._instance

    def _initialize_firebase(self):
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        raw_private_key = os.getenv("FIREBASE_PRIVATE_KEY")

        if not project_id or not client_email or not raw_private_key:
            logger.warning("Firebase credentials missing in environment. Running in local fallback mode.")
            self._is_connected = False
            self._status_msg = "disconnected (local fallback mode)"
            self._db = None
            return

        # Sanitize private key replacement for quotes and escaped newlines
        clean_key = raw_private_key.strip()
        if (clean_key.startswith('"') and clean_key.endswith('"')) or (clean_key.startswith("'") and clean_key.endswith("'")):
            clean_key = clean_key[1:-1]

        formatted_private_key = clean_key.replace("\\n", "\n").strip()
        if not formatted_private_key.startswith("-----BEGIN PRIVATE KEY-----"):
            formatted_private_key = f"-----BEGIN PRIVATE KEY-----\n{formatted_private_key}"
        if not formatted_private_key.endswith("-----END PRIVATE KEY-----"):
            formatted_private_key = f"{formatted_private_key}\n-----END PRIVATE KEY-----"

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", "razorguard-key-id"),
                    "private_key": formatted_private_key,
                    "client_email": client_email,
                    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{quote(client_email, safe='')}"
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred, {"projectId": project_id})

            db_client = firestore.client()

            # Perform real Firestore connectivity verification test with 2.0s timeout
            try:
                db_client.collection("_health_check").limit(1).get(timeout=2.0)
                self._db = db_client
                self._is_connected = True
                self._status_msg = "connected"
                logger.info("Firebase Admin SDK successfully connected and verified with Cloud Firestore.")
            except Exception as conn_err:
                err_msg = str(conn_err)
                if "Cloud Firestore API has not been used" in err_msg or "disabled" in err_msg:
                    self._status_msg = f"disconnected (Cloud Firestore API disabled in GCP project '{project_id}')"
                else:
                    self._status_msg = f"disconnected ({type(conn_err).__name__})"
                logger.error(f"Firestore connectivity verification test failed: {self._status_msg}")
                self._db = None
                self._is_connected = False

        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {type(e).__name__}. Falling back to local mode.")
            self._is_connected = False
            self._status_msg = f"disconnected ({type(e).__name__})"
            self._db = None

    def get_db(self):
        return self._db

    def is_connected(self) -> bool:
        return self._is_connected

    def get_status_message(self) -> str:
        return self._status_msg


# Singleton getter
def get_firebase_service() -> FirebaseService:
    return FirebaseService()
