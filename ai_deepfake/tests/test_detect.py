"""
PR1 data-contract tests for DetectionResult, DetectionStatus, RiskLevel, and AISettings.
These tests validate enum values, dataclass field defaults, serialization,
and config constants — no model inference is tested here.
"""

import pytest
from ai_deepfake.detect import DetectionResult, DetectionStatus, RiskLevel
from ai_deepfake.ai_config import settings


class TestDetectionStatusEnum:
    def test_detection_status_enum_values(self):
        assert DetectionStatus.OK.value == "ok"
        assert DetectionStatus.NO_FACE.value == "no_face"
        assert DetectionStatus.FACE_DETECTION_ERROR.value == "face_detection_error"
        assert DetectionStatus.NO_MODEL.value == "no_model"
        assert DetectionStatus.ERROR.value == "error"
        assert len(DetectionStatus) == 5


class TestRiskLevelEnum:
    def test_risk_level_enum_values(self):
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.CRITICAL.value == "critical"
        assert len(RiskLevel) == 4


class TestDetectionResult:
    def test_detection_result_to_dict(self):
        result = DetectionResult(
            is_fake=True,
            confidence=0.85,
            fake_probability=0.85,
            risk_level=RiskLevel.CRITICAL,
            processing_time=0.123,
            details={"face_detected": True, "model_score": 0.83},
        )
        d = result.to_dict()
        assert d["is_fake"] is True
        assert d["confidence"] == 0.85
        assert d["fake_probability"] == 0.85
        assert d["risk_level"] == "critical"
        assert d["status"] == "ok"
        assert d["processing_time"] == 0.123
        assert d["details"]["face_detected"] is True

    def test_detection_result_fake_prob_property(self):
        result = DetectionResult(
            is_fake=True,
            confidence=0.9,
            fake_probability=0.9,
            risk_level=RiskLevel.CRITICAL,
            processing_time=0.1,
            details={},
        )
        assert result.fake_prob == result.fake_probability

    def test_detection_result_real_prob_property(self):
        result = DetectionResult(
            is_fake=False,
            confidence=0.8,
            fake_probability=0.2,
            risk_level=RiskLevel.LOW,
            processing_time=0.1,
            details={},
        )
        assert result.real_prob == pytest.approx(1.0 - result.fake_probability)


class TestConfig:
    def test_config_defaults(self):
        assert settings.DEFAULT_THRESHOLD == 0.50
        assert settings.V1_WEIGHT == 0.4
        assert settings.V2_WEIGHT == 0.6
        assert settings.ENABLE_TTA is False
        assert settings.ENABLE_SIGNAL_ANALYSIS is True

    def test_config_signal_constants(self):
        assert settings.SIGNAL_LAPLACIAN_THRESHOLD == 100.0
        assert settings.SIGNAL_HIGH_FREQ_THRESHOLD == 13.0
        assert settings.SIGNAL_BOOST_STEP == 0.03
