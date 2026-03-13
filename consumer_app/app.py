"""
DeepTrust Consumer App — v2
===========================
Gọi Core API (v1) để verify ảnh, quản lý audit log,
và cung cấp trang public /verify/{hash} cho verification links.
"""

import os
import sqlite3
import json
import time
import mimetypes
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, Request, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DB_PATH  = BASE_DIR / "data" / "consumer_audit.db"

CORE_API_URL       = os.getenv("VERIFICATION_API_URL", "http://127.0.0.1:8000")
API_KEY            = os.getenv("API_KEY", "")          # X-API-Key for core API
APPROVAL_THRESHOLD = float(os.getenv("APPROVAL_THRESHOLD", "0.75"))
REVIEW_THRESHOLD   = float(os.getenv("REVIEW_THRESHOLD",   "0.55"))
APP_TITLE          = os.getenv("APP_TITLE", "DeepTrust.AI — Newsroom Portal")

# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield

app = FastAPI(title="DeepTrust Consumer App v2", lifespan=lifespan)
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# ── Database ──────────────────────────────────────────────────────────────────
def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS verification_audit (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at       TEXT    NOT NULL,
            user_address     TEXT    NOT NULL,
            filename         TEXT    NOT NULL,
            image_hash       TEXT,
            label            TEXT    NOT NULL,
            model_confidence REAL    NOT NULL,
            real_score       REAL    NOT NULL,
            fake_score       REAL    NOT NULL,
            risk_level       TEXT    NOT NULL DEFAULT 'unknown',
            decision         TEXT    NOT NULL,
            reason           TEXT    NOT NULL,
            external_id      TEXT    NOT NULL DEFAULT '',
            verification_link TEXT   NOT NULL DEFAULT '',
            tx_hash          TEXT
        )
    """)
    # Lightweight migrations for existing DB files created by older versions.
    # SQLite `CREATE TABLE IF NOT EXISTS` will not add new columns.
    _migrate_db(conn)
    conn.commit()
    conn.close()


def _migrate_db(conn: sqlite3.Connection) -> None:
    cols = {
        r["name"]
        for r in conn.execute("PRAGMA table_info(verification_audit)").fetchall()
    }

    def ensure(col_name: str, ddl: str) -> None:
        if col_name in cols:
            return
        conn.execute(f"ALTER TABLE verification_audit ADD COLUMN {ddl}")
        cols.add(col_name)

    # Columns introduced across iterations
    ensure("real_score", "real_score REAL NOT NULL DEFAULT 0")
    ensure("fake_score", "fake_score REAL NOT NULL DEFAULT 0")
    ensure("risk_level", "risk_level TEXT NOT NULL DEFAULT 'unknown'")
    ensure("external_id", "external_id TEXT NOT NULL DEFAULT ''")
    ensure("verification_link", "verification_link TEXT NOT NULL DEFAULT ''")
    ensure("tx_hash", "tx_hash TEXT")
    # DID / VC / ZKP enrichment (best-effort)
    ensure("user_did", "user_did TEXT NOT NULL DEFAULT ''")
    ensure("did_status", "did_status TEXT NOT NULL DEFAULT ''")
    ensure("credential_id", "credential_id TEXT NOT NULL DEFAULT ''")
    ensure("credential_json", "credential_json TEXT NOT NULL DEFAULT ''")
    ensure("vc_status", "vc_status TEXT NOT NULL DEFAULT ''")
    ensure("zkp_status", "zkp_status TEXT NOT NULL DEFAULT ''")
    ensure("zkp_oracle_address", "zkp_oracle_address TEXT NOT NULL DEFAULT ''")
    ensure("zkp_timestamp", "zkp_timestamp INTEGER NOT NULL DEFAULT 0")
    ensure("zkp_oracle_secret", "zkp_oracle_secret TEXT NOT NULL DEFAULT ''")





def save_audit(
    user_address: str,
    filename: str,
    image_hash: str,
    label: str,
    model_confidence: float,
    real_score: float,
    fake_score: float,
    risk_level: str,
    decision: str,
    reason: str,
    external_id: str = "",
    verification_link: str = "",
    tx_hash: str | None = None,
    user_did: str = "",
    did_status: str = "",
    credential_id: str = "",
    credential_json: str = "",
    vc_status: str = "",
    zkp_status: str = "",
    zkp_oracle_address: str = "",
    zkp_timestamp: int = 0,
    zkp_oracle_secret: str = "",
) -> int:
    conn = _get_conn()
    cur = conn.execute(
        """
        INSERT INTO verification_audit (
            created_at, user_address, filename, image_hash,
            label, model_confidence, real_score, fake_score, risk_level,
            decision, reason, external_id, verification_link, tx_hash,
            user_did, did_status,
            credential_id, credential_json, vc_status,
            zkp_status, zkp_oracle_address, zkp_timestamp, zkp_oracle_secret
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,?, ?,?,?, ?,?,?,?)
        """,
        (
            datetime.now(timezone.utc).isoformat(),
            user_address, filename, image_hash,
            label, model_confidence, real_score, fake_score, risk_level,
            decision, reason, external_id, verification_link, tx_hash,
            user_did, did_status,
            credential_id, credential_json, vc_status,
            zkp_status, zkp_oracle_address, int(zkp_timestamp or 0), zkp_oracle_secret,
        ),
    )
    row_id = cur.lastrowid
    conn.commit()
    conn.close()
    return row_id


def fetch_recent(limit: int = 20, label_filter: str = "") -> list[dict]:
    conn = _get_conn()
    if label_filter and label_filter in ("REAL", "FAKE"):
        rows = conn.execute(
            """SELECT * FROM verification_audit WHERE label = ?
               ORDER BY id DESC LIMIT ?""",
            (label_filter, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM verification_audit ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def fetch_audit_by_tx_hash(tx_hash: str) -> dict | None:
    """Fetch audit record by blockchain transaction hash."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM verification_audit WHERE tx_hash = ? ORDER BY id DESC LIMIT 1",
        (tx_hash,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def fetch_audit_latest_by_hash(image_hash: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM verification_audit WHERE image_hash = ? ORDER BY id DESC LIMIT 1",
        (image_hash,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def fetch_stats() -> dict:
    conn = _get_conn()
    row = conn.execute("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN label='REAL' THEN 1 ELSE 0 END)               AS real,
            SUM(CASE WHEN label='FAKE' THEN 1 ELSE 0 END)               AS fake,
            SUM(CASE WHEN decision='APPROVED' THEN 1 ELSE 0 END)        AS approved,
            SUM(CASE WHEN decision='REVIEW_REQUIRED' THEN 1 ELSE 0 END) AS review,
            SUM(CASE WHEN decision='REJECTED' THEN 1 ELSE 0 END)        AS rejected
        FROM verification_audit
    """).fetchone()
    conn.close()
    return {
        "total":    row[0] or 0,
        "real":     row[1] or 0,
        "fake":     row[2] or 0,
        "approved": row[3] or 0,
        "review":   row[4] or 0,
        "rejected": row[5] or 0,
    }


# ── Core API helpers ─────────────────────────────────────────────────────────
def _api_headers() -> dict:
    h = {}
    if API_KEY:
        h["X-API-Key"] = API_KEY
    return h


async def _call_verify(file_bytes: bytes, filename: str, user_address: str, external_id: str = "") -> dict:
    mime = mimetypes.guess_type(filename or "")[0] or "application/octet-stream"
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{CORE_API_URL}/v1/consumer/verify-image",
            headers=_api_headers(),
            files={"file": (filename, file_bytes, mime)},
            data={"user_address": user_address.lower(), "external_id": external_id},
        )
    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        raise RuntimeError(f"Core API error {resp.status_code}: {detail}")
    return resp.json()


async def _call_image_status_public(image_hash: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{CORE_API_URL}/v1/consumer/image-status-public/{image_hash}",
        )
    if resp.status_code != 200:
        return {"found": False, "image_hash": image_hash}
    return resp.json()


# ── Optional Core API helpers (DID / VC / ZKP) ────────────────────────────────
async def _call_resolve_did_by_address(address: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{CORE_API_URL}/api/did/resolve-by-address/{address}",
            headers=_api_headers(),
        )
    if resp.status_code != 200:
        return {"available": False, "address": address, "error": resp.text}
    data = resp.json()
    data["available"] = True
    return data


async def _call_issue_credential(file_bytes: bytes, filename: str, user_address: str) -> dict:
    mime = mimetypes.guess_type(filename or "")[0] or "application/octet-stream"
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{CORE_API_URL}/api/credential/issue",
            headers=_api_headers(),
            files={"file": (filename, file_bytes, mime)},
            data={"user_address": user_address.lower()},
        )
    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        return {"available": False, "error": detail}
    data = resp.json()
    data["available"] = True
    return data


async def _call_verify_zkp(file_bytes: bytes, filename: str, user_address: str) -> dict:
    mime = mimetypes.guess_type(filename or "")[0] or "application/octet-stream"
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{CORE_API_URL}/api/verify-zkp",
            headers=_api_headers(),
            files={"file": (filename, file_bytes, mime)},
            data={"user_address": user_address.lower()},
        )
    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        return {"available": False, "error": detail}
    data = resp.json()
    data["available"] = True
    return data


async def _call_blockchain_record(image_hash: str, user_address: str, subject_did: str, is_real: bool, confidence: float) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{CORE_API_URL}/api/blockchain/record",
            headers=_api_headers(),
            data={
                "image_hash": image_hash,
                "user_address": user_address.lower(),
                "subject_did": subject_did or "",
                "is_real": "true" if is_real else "false",
                "confidence": str(confidence),
            },
        )
    if resp.status_code != 200:
        detail = resp.text
        try:
            detail = resp.json().get("detail", detail)
        except Exception:
            pass
        return {"available": False, "error": detail}
    data = resp.json()
    data["available"] = True
    return data


_health_cache: dict = {"data": {"status": "unknown"}, "ts": 0.0}
_HEALTH_TTL = 20  # seconds

async def _call_health() -> dict:
    now = time.monotonic()
    if now - _health_cache["ts"] < _HEALTH_TTL:
        return _health_cache["data"]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{CORE_API_URL}/v1/health")
        data = resp.json() if resp.status_code == 200 else {"status": "error"}
    except Exception:
        data = {"status": "offline"}
    _health_cache["data"] = data
    _health_cache["ts"] = now
    return data


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, filter: str = "", hash: str = "", tx: str = ""):
    """
    Portal chính — có thể nhận query ?hash=xxx hoặc ?tx=xxx từ frontend
    để tự động tra cứu và hiển thị kết quả đã verify.
    """
    result_payload = None
    error_message = None
    
    # Nếu có hash hoặc tx từ frontend → tự động tra cứu
    if hash or tx:
        try:
            if hash:
                # Tra cứu theo image_hash
                data = await _call_image_status_public(hash)
                if data.get("found"):
                    # Lấy thêm audit local nếu có
                    audit = fetch_audit_latest_by_hash(hash)
                    if audit:
                        result_payload = {
                            "filename": audit.get("filename", ""),
                            "label": audit.get("label", data.get("label", "UNKNOWN")),
                            "model_confidence": float(audit.get("model_confidence", data.get("confidence", 0.0))),
                            "real_score": float(audit.get("real_score", data.get("real_prob", 0.0))),
                            "fake_score": float(audit.get("fake_score", data.get("fake_prob", 0.0))),
                            "risk_level": audit.get("risk_level", data.get("risk_level", "unknown")),
                            "decision": audit.get("decision", data.get("decision", "UNKNOWN")),
                            "reason": audit.get("reason", data.get("reason", "")),
                            "image_hash": hash,
                            "verification_link": f"/verify/{hash}",
                            "external_id": audit.get("external_id", ""),
                            "tx_hash": audit.get("tx_hash"),
                            "user_did": audit.get("user_did"),
                            "vc_status": audit.get("vc_status"),
                            "zkp_status": audit.get("zkp_status"),
                            "credential_id": audit.get("credential_id"),
                        }
                    else:
                        # Chỉ có data từ Core API
                        result_payload = {
                            "label": data.get("label", "UNKNOWN"),
                            "model_confidence": float(data.get("confidence", 0.0)),
                            "real_score": float(data.get("real_prob", 0.0)),
                            "fake_score": float(data.get("fake_prob", 0.0)),
                            "risk_level": data.get("risk_level", "unknown"),
                            "decision": data.get("decision", "UNKNOWN"),
                            "reason": data.get("reason", ""),
                            "image_hash": hash,
                            "verification_link": f"/verify/{hash}",
                        }
                else:
                    error_message = f"Không tìm thấy bản ghi xác thực cho hash: {hash}"
            elif tx:
                # Tra cứu theo tx_hash (từ audit local)
                audit = fetch_audit_by_tx_hash(tx)
                if audit:
                    result_payload = {
                        "filename": audit.get("filename", ""),
                        "label": audit.get("label", "UNKNOWN"),
                        "model_confidence": float(audit.get("model_confidence", 0.0)),
                        "real_score": float(audit.get("real_score", 0.0)),
                        "fake_score": float(audit.get("fake_score", 0.0)),
                        "risk_level": audit.get("risk_level", "unknown"),
                        "decision": audit.get("decision", "UNKNOWN"),
                        "reason": audit.get("reason", ""),
                        "image_hash": audit.get("image_hash", ""),
                        "verification_link": f"/verify/{audit.get('image_hash', '')}",
                        "external_id": audit.get("external_id", ""),
                        "tx_hash": tx,
                        "user_did": audit.get("user_did"),
                        "vc_status": audit.get("vc_status"),
                        "zkp_status": audit.get("zkp_status"),
                        "credential_id": audit.get("credential_id"),
                    }
                else:
                    error_message = f"Không tìm thấy bản ghi xác thực cho transaction: {tx}"
        except Exception as exc:
            error_message = f"Lỗi tra cứu: {str(exc)}"
    
    health = await _call_health()
    return templates.TemplateResponse("index.html", {
        "request":            request,
        "api_url":            CORE_API_URL,
        "approval_threshold": APPROVAL_THRESHOLD,
        "review_threshold":   REVIEW_THRESHOLD,
        "recent":             fetch_recent(limit=20, label_filter=filter.upper()),
        "stats":              fetch_stats(),
        "health":             health,
        "active_filter":      filter.upper(),
        "app_title":          APP_TITLE,
        "result":             result_payload,
        "error":              error_message,
    })


@app.post("/verify", response_class=HTMLResponse)
async def verify(
    request: Request,
    file: UploadFile = File(...),
    user_address: str = Form(default="anonymous"),
    external_id: str  = Form(default=""),
    issue_vc: str = Form(default="0"),
    gen_zkp: str = Form(default="0"),
    record_chain: str = Form(default="0"),
):
    result_payload = None
    error_message  = None

    try:
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise ValueError("File too large (max 10 MB)")

        verification = await _call_verify(
            file_bytes, file.filename or "upload.jpg", user_address, external_id
        )

        # Optional enrichments (DID / VC / ZKP) - best-effort
        did_payload: dict = {"available": False}
        vc_payload: dict = {"available": False}
        zkp_payload: dict = {"available": False}

        if user_address and user_address != "anonymous":
            try:
                did_payload = await _call_resolve_did_by_address(user_address.lower())
            except Exception as _exc:
                did_payload = {"available": False, "error": str(_exc)}

        if issue_vc in ("1", "true", "on", "yes"):
            try:
                vc_payload = await _call_issue_credential(
                    file_bytes, file.filename or "upload.jpg", user_address
                )
            except Exception as _exc:
                vc_payload = {"available": False, "error": str(_exc)}

        if gen_zkp in ("1", "true", "on", "yes"):
            try:
                zkp_payload = await _call_verify_zkp(
                    file_bytes, file.filename or "upload.jpg", user_address
                )
            except Exception as _exc:
                zkp_payload = {"available": False, "error": str(_exc)}

        label            = verification.get("label", "UNKNOWN")
        model_confidence = float(verification.get("confidence", 0.0))
        real_score       = float(verification.get("real_prob", 1 - model_confidence))
        fake_score       = float(verification.get("fake_prob", model_confidence))
        risk_level       = verification.get("risk_level", "unknown")
        decision         = verification.get("decision", "REJECTED")
        reason           = verification.get("reason", "")
        image_hash       = verification.get("image_hash", "")
        verification_link = verification.get("verification_link", "")

        # Normalize DID fields
        user_did = ""
        did_status = ""
        if did_payload.get("available"):
            user_did = did_payload.get("did", "") or did_payload.get("document", {}).get("id", "")
            did_status = "resolved"
        elif user_address and user_address != "anonymous":
            did_status = did_payload.get("error", "not found")

        # Normalize VC fields
        credential_id = ""
        credential_json = ""
        vc_status = ""
        if vc_payload.get("available"):
            credential_id = vc_payload.get("credential_id", "") or vc_payload.get("credential", {}).get("id", "")
            credential_json = json.dumps(vc_payload.get("credential", {}), ensure_ascii=False)
            vc_status = "issued"
        elif issue_vc in ("1", "true", "on", "yes"):
            vc_status = vc_payload.get("error", "unavailable")

        # Normalize ZKP fields
        zkp_status = ""
        zkp_oracle_address = ""
        zkp_timestamp = 0
        zkp_oracle_secret = ""
        if zkp_payload.get("available"):
            can = bool(zkp_payload.get("can_generate_proof", False))
            if not can:
                # Core API returns message when image is FAKE/unsupported
                zkp_status = str(zkp_payload.get("message", "cannot_generate_proof"))
            else:
                z = zkp_payload.get("zkp_input", {}) or {}
                zkp_oracle_address = str(z.get("oracle_address", "") or "")
                zkp_timestamp = int(z.get("timestamp", 0) or 0)
                # NOTE: oracle_secret is sensitive; we store it for demo/audit convenience
                zkp_oracle_secret = str(z.get("oracle_secret", "") or "")
                zkp_status = "generated"
        elif gen_zkp in ("1", "true", "on", "yes"):
            zkp_status = zkp_payload.get("error", "unavailable")

        # Optional: record on-chain via server (no MetaMask)
        tx_hash = None
        chain_status = ""
        if record_chain in ("1", "true", "on", "yes"):
            try:
                chain_payload = await _call_blockchain_record(
                    image_hash=image_hash,
                    user_address=user_address,
                    subject_did=user_did,
                    is_real=(label == "REAL"),
                    confidence=model_confidence,
                )
                if chain_payload.get("available") and chain_payload.get("ok"):
                    tx_hash = chain_payload.get("tx_hash")
                    chain_status = "recorded"
                else:
                    chain_status = chain_payload.get("error", "unavailable")
            except Exception as _exc:
                chain_status = str(_exc)

        save_audit(
            user_address=user_address,
            filename=file.filename or "unknown",
            image_hash=image_hash,
            label=label,
            model_confidence=model_confidence,
            real_score=real_score,
            fake_score=fake_score,
            risk_level=risk_level,
            decision=decision,
            reason=reason,
            external_id=external_id,
            verification_link=verification_link,
            tx_hash=tx_hash,
            user_did=user_did,
            did_status=did_status,
            credential_id=credential_id,
            credential_json=credential_json,
            vc_status=vc_status,
            zkp_status=zkp_status,
            zkp_oracle_address=zkp_oracle_address,
            zkp_timestamp=zkp_timestamp,
            zkp_oracle_secret=zkp_oracle_secret,
        )

        result_payload = {
            "filename":          file.filename,
            "label":             label,
            "model_confidence":  model_confidence,
            "real_score":        real_score,
            "fake_score":        fake_score,
            "risk_level":        risk_level,
            "decision":          decision,
            "reason":            reason,
            "image_hash":        image_hash,
            "verification_link": verification_link,
            "external_id":       external_id,
            "user_did":          user_did,
            "did_status":        did_status,
            "credential_id":     credential_id,
            "vc_status":         vc_status,
            "zkp_status":        zkp_status,
            "zkp_oracle_address": zkp_oracle_address,
            "zkp_timestamp":     zkp_timestamp,
            "tx_hash":           tx_hash,
            "chain_status":      chain_status,
        }

    except Exception as exc:
        error_message = str(exc)

    health = await _call_health()
    return templates.TemplateResponse("index.html", {
        "request":            request,
        "api_url":            CORE_API_URL,
        "approval_threshold": APPROVAL_THRESHOLD,
        "review_threshold":   REVIEW_THRESHOLD,
        "recent":             fetch_recent(limit=20),
        "stats":              fetch_stats(),
        "health":             health,
        "result":             result_payload,
        "error":              error_message,
        "active_filter":      "",
        "app_title":          APP_TITLE,
    })


@app.get("/verify/{image_hash}", response_class=HTMLResponse)
async def public_verify_page(request: Request, image_hash: str):
    """
    Public verification page — linked from ``verification_link`` in API responses.
    Anyone can visit this URL to check authenticity of an image.
    """
    data = await _call_image_status_public(image_hash)
    audit = fetch_audit_latest_by_hash(image_hash)
    return templates.TemplateResponse("verify_public.html", {
        "request":    request,
        "image_hash": image_hash,
        "data":       data,
        "audit":      audit,
        "app_title":  APP_TITLE,
        "api_url":    CORE_API_URL,
    })


@app.get("/api/stats")
async def api_stats():
    """JSON stats for external dashboards."""
    return JSONResponse(fetch_stats())


@app.get("/api/health")
async def api_health():
    health = await _call_health()
    return JSONResponse(health)


@app.get("/api/verify-status/{image_hash}")
async def api_verify_status(image_hash: str):
    """JSON proxy for public image status — used by Check by Hash panel."""
    data = await _call_image_status_public(image_hash)
    return JSONResponse(data)


@app.get("/api/audit/credential/{image_hash}")
async def api_audit_credential(image_hash: str):
    """Fetch stored VC JSON for an image_hash (if issued) from local audit DB."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT credential_json, credential_id, user_did, created_at FROM verification_audit WHERE image_hash = ? ORDER BY id DESC LIMIT 1",
        (image_hash,),
    ).fetchone()
    conn.close()
    if not row or not (row["credential_json"] or "").strip():
        return JSONResponse({"found": False, "image_hash": image_hash}, status_code=404)
    try:
        payload = json.loads(row["credential_json"])
    except Exception:
        payload = {"raw": row["credential_json"]}
    return JSONResponse({
        "found": True,
        "image_hash": image_hash,
        "credential_id": row["credential_id"],
        "user_did": row["user_did"],
        "created_at": row["created_at"],
        "credential": payload,
    })


@app.post("/api/audit/update-tx")
async def api_audit_update_tx(
    image_hash: str = Form(...),
    tx_hash: str = Form(...),
):
    """Attach an on-chain tx hash to the latest local audit record for an image_hash."""
    tx_hash = (tx_hash or "").strip()
    if not tx_hash:
        raise HTTPException(status_code=400, detail="tx_hash is required")
    conn = _get_conn()
    row = conn.execute(
        "SELECT id FROM verification_audit WHERE image_hash = ? ORDER BY id DESC LIMIT 1",
        (image_hash,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="audit record not found for this image_hash")
    conn.execute(
        "UPDATE verification_audit SET tx_hash = ? WHERE id = ?",
        (tx_hash, row["id"]),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "image_hash": image_hash, "tx_hash": tx_hash}
