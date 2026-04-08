import api
from ai_deepfake.detect import DetectionStatus, RiskLevel
from .conftest import DummyDetectionResult, DummyDetector


def _img_file():
    return {"file": ("face.jpg", b"fake-image-bytes", "image/jpeg")}


def test_api_verify_ok_result_returns_classification_and_signature(client, monkeypatch):
    monkeypatch.setattr(
        api,
        "detector",
        DummyDetector(
            DummyDetectionResult(
                status=DetectionStatus.OK,
                is_fake=False,
                confidence=0.88,
                fake_probability=0.12,
                risk_level=RiskLevel.LOW,
                details={"face_detected": True},
            )
        ),
    )

    response = client.post("/api/verify", data={"user_address": "0xabc"}, files=_img_file())
    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "REAL"
    assert body["confidence"] == 0.88
    assert body["fake_prob"] == 0.12
    assert "signature" in body and body["signature"]


def test_api_verify_non_ok_status_returns_error_payload(client, monkeypatch):
    monkeypatch.setattr(
        api,
        "detector",
        DummyDetector(
            DummyDetectionResult(
                status=DetectionStatus.NO_FACE,
                is_fake=False,
                confidence=0.0,
                fake_probability=0.0,
                risk_level=RiskLevel.LOW,
                details={"error": "NO_FACE_DETECTED", "face_detected": False},
            )
        ),
    )

    response = client.post("/api/verify", data={"user_address": "0xabc"}, files=_img_file())
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "no_face"
    assert body["label"] == "ERROR"
    assert body["error_code"] == "NO_FACE_DETECTED"
    assert body["face_detected"] is False
    assert "signature" not in body


def test_api_verify_zkp_non_ok_status_never_generates_proof(client, monkeypatch):
    monkeypatch.setattr(
        api,
        "detector",
        DummyDetector(
            DummyDetectionResult(
                status=DetectionStatus.FACE_DETECTION_ERROR,
                is_fake=False,
                confidence=0.0,
                fake_probability=0.0,
                risk_level=RiskLevel.LOW,
                details={"error": "FACE_DETECTION_ERROR: mock", "face_detected": False},
            )
        ),
    )

    response = client.post("/api/verify-zkp", data={"user_address": "0xabc"}, files=_img_file())
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "face_detection_error"
    assert body["can_generate_proof"] is False
    assert body["label"] == "ERROR"


def test_api_credential_issue_non_ok_status_rejected(client, monkeypatch):
    class _DummyDidService:
        def __init__(self):
            self.issue_called = False

        def issue_verification_credential(self, **_kwargs):
            self.issue_called = True
            raise AssertionError("issue_verification_credential must not be called when status != ok")

    did_service = _DummyDidService()
    monkeypatch.setattr(
        api,
        "did_service",
        did_service,
    )
    monkeypatch.setattr(api, "DID_AVAILABLE", True)
    monkeypatch.setattr(
        api,
        "detector",
        DummyDetector(
            DummyDetectionResult(
                status=DetectionStatus.NO_MODEL,
                is_fake=False,
                confidence=0.0,
                fake_probability=0.0,
                risk_level=RiskLevel.LOW,
                details={"error": "No model prediction"},
            )
        ),
    )

    response = client.post("/api/credential/issue", data={"user_address": "0xabc"}, files=_img_file())
    assert response.status_code == 422
    assert "non-classifiable: no_model" in response.json()["detail"]
    assert did_service.issue_called is False
