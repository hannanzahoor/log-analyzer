"""
ML Classifier Service
Random Forest + SVM classifiers using scikit-learn (Python 3.14 compatible)
DBSCAN anomaly detection (replaces hdbscan)
All pure scikit-learn — no C extensions beyond scikit-learn itself.
"""

import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import f1_score, classification_report

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

ATTACK_LABELS = {
    0: "NORMAL",
    1: "BRUTE_FORCE",
    2: "PORT_SCAN",
    3: "DDOS",
    4: "UNAUTHORIZED_ACCESS",
    5: "DATA_EXFILTRATION",
    6: "ANOMALY",
}

LABEL_COLORS = {
    "NORMAL": "#22c55e",
    "BRUTE_FORCE": "#ef4444",
    "PORT_SCAN": "#f97316",
    "DDOS": "#dc2626",
    "UNAUTHORIZED_ACCESS": "#a855f7",
    "DATA_EXFILTRATION": "#ec4899",
    "ANOMALY": "#eab308",
}

SEVERITY_MAP = {
    "NORMAL": "LOW",
    "BRUTE_FORCE": "HIGH",
    "PORT_SCAN": "MEDIUM",
    "DDOS": "CRITICAL",
    "UNAUTHORIZED_ACCESS": "HIGH",
    "DATA_EXFILTRATION": "HIGH",
    "ANOMALY": "MEDIUM",
}


class ThreatClassifier:
    def __init__(self, model_type: str = "random_forest"):
        self.model_type = model_type
        self.model = None
        self.label_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.is_trained = False
        self._load_or_init()

    def _paths(self):
        base = os.path.join(MODEL_DIR, self.model_type)
        return f"{base}_model.joblib", f"{base}_encoder.joblib", f"{base}_scaler.joblib"

    def _load_or_init(self):
        mp, ep, sp = self._paths()
        if os.path.exists(mp) and os.path.exists(ep):
            self.model = joblib.load(mp)
            self.label_encoder = joblib.load(ep)
            if os.path.exists(sp):
                self.scaler = joblib.load(sp)
            self.is_trained = True
            print(f"[Classifier] Loaded {self.model_type} model.")
        else:
            if self.model_type == "random_forest":
                self.model = RandomForestClassifier(
                    n_estimators=200,
                    max_depth=15,
                    min_samples_split=4,
                    random_state=42,
                    n_jobs=-1,
                    class_weight="balanced",
                )
            else:
                self.model = SVC(
                    kernel="rbf",
                    C=10,
                    gamma="scale",
                    probability=True,
                    random_state=42,
                )

    def train(self, X: np.ndarray, y: np.ndarray):
        X_scaled = self.scaler.fit_transform(X)
        y_enc = self.label_encoder.fit_transform(y)
        self.model.fit(X_scaled, y_enc)
        self.is_trained = True

        mp, ep, sp = self._paths()
        joblib.dump(self.model, mp)
        joblib.dump(self.label_encoder, ep)
        joblib.dump(self.scaler, sp)
        print(f"[Classifier] Trained and saved {self.model_type}.")

    def predict(self, X: np.ndarray) -> list:
        if not self.is_trained:
            return ["UNKNOWN"] * (1 if X.ndim == 1 else len(X))
        if X.ndim == 1:
            X = X.reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        preds = self.model.predict(X_scaled)
        return self.label_encoder.inverse_transform(preds).tolist()

    def predict_proba(self, X: np.ndarray) -> dict:
        if not self.is_trained:
            return {"label": "UNKNOWN", "confidence": 0.0, "probabilities": {}}
        if X.ndim == 1:
            X = X.reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        proba = self.model.predict_proba(X_scaled)[0]
        classes = self.label_encoder.classes_
        prob_dict = {cls: float(p) for cls, p in zip(classes, proba)}
        top = max(prob_dict, key=prob_dict.get)
        return {
            "label": top,
            "confidence": float(prob_dict[top]),
            "probabilities": prob_dict,
            "color": LABEL_COLORS.get(top, "#6b7280"),
        }

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> dict:
        if not self.is_trained:
            return {}
        if X_test.ndim == 1:
            X_test = X_test.reshape(1, -1)
        X_scaled = self.scaler.transform(X_test)
        y_enc = self.label_encoder.transform(y_test)
        preds = self.model.predict(X_scaled)
        return {
            "f1_score": float(f1_score(y_enc, preds, average="weighted")),
            "report": classification_report(y_enc, preds, output_dict=True),
        }


class AnomalyDetector:
    """DBSCAN-based anomaly detector — replaces hdbscan, pure scikit-learn"""

    def __init__(self):
        self.dbscan = None
        self.scaler = StandardScaler()
        self.is_fitted = False
        mp = os.path.join(MODEL_DIR, "dbscan_model.joblib")
        sp = os.path.join(MODEL_DIR, "dbscan_scaler.joblib")
        if os.path.exists(mp):
            self.dbscan = joblib.load(mp)
            if os.path.exists(sp):
                self.scaler = joblib.load(sp)
            self.is_fitted = True
            print("[AnomalyDetector] Loaded DBSCAN model.")

    def fit(self, X: np.ndarray):
        X_scaled = self.scaler.fit_transform(X)
        self.dbscan = DBSCAN(eps=0.5, min_samples=3, metric="euclidean", n_jobs=-1)
        self.dbscan.fit(X_scaled)
        self.is_fitted = True
        joblib.dump(self.dbscan, os.path.join(MODEL_DIR, "dbscan_model.joblib"))
        joblib.dump(self.scaler, os.path.join(MODEL_DIR, "dbscan_scaler.joblib"))
        print("[AnomalyDetector] DBSCAN fitted and saved.")

    def detect(self, X: np.ndarray) -> list:
        """Returns list of anomaly dicts. Uses distance to nearest core point."""
        if not self.is_fitted:
            return [{"is_anomaly": False, "outlier_score": 0.0, "cluster_id": 0}]

        if X.ndim == 1:
            X = X.reshape(1, -1)

        X_scaled = self.scaler.transform(X)

        # Predict: compute distance to training core samples
        from sklearn.metrics import pairwise_distances
        core_samples = self.dbscan.components_  # core point embeddings

        results = []
        for i in range(len(X_scaled)):
            if len(core_samples) == 0:
                results.append({"is_anomaly": False, "outlier_score": 0.0, "cluster_id": 0})
                continue
            dists = pairwise_distances(X_scaled[i:i+1], core_samples, metric="euclidean")
            min_dist = float(dists.min())
            is_anomaly = min_dist > self.dbscan.eps * 1.5
            outlier_score = min(min_dist / (self.dbscan.eps * 3), 1.0)
            results.append({
                "is_anomaly": is_anomaly,
                "outlier_score": float(outlier_score),
                "cluster_id": -1 if is_anomaly else 0,
            })
        return results


def rule_based_classify(parsed_log: dict) -> dict:
    """Heuristic rule-based classifier — always available, no model needed"""
    msg = (parsed_log.get("message", "") + " " + parsed_log.get("raw", "")).lower()

    if any(k in msg for k in [
        "failed password", "authentication failure", "invalid user",
        "too many authentication", "maximum authentication", "failed login",
        "incorrect password",
    ]):
        return {
            "threat_type": "BRUTE_FORCE",
            "severity": "HIGH",
            "confidence": 0.88,
            "source_ips": parsed_log.get("ip_addresses", []),
            "description": "Multiple authentication failures — possible brute-force attack",
            "color": LABEL_COLORS["BRUTE_FORCE"],
        }

    if any(k in msg for k in [
        "syn flood", "port scan", "nmap", "masscan",
        "connection refused", "multiple ports", "port sweep",
    ]):
        return {
            "threat_type": "PORT_SCAN",
            "severity": "MEDIUM",
            "confidence": 0.80,
            "description": "Port scanning activity detected",
            "color": LABEL_COLORS["PORT_SCAN"],
        }

    if any(k in msg for k in [
        "ddos", "dos attack", "syn flood", "packet flood",
        "rate limit exceeded", "bandwidth exceeded", "traffic spike",
    ]):
        return {
            "threat_type": "DDOS",
            "severity": "CRITICAL",
            "confidence": 0.91,
            "description": "DDoS/DoS attack pattern detected",
            "color": LABEL_COLORS["DDOS"],
        }

    if any(k in msg for k in [
        "unauthorized", "permission denied", "access denied",
        "forbidden", "root login refused", "sudo: pam",
    ]):
        return {
            "threat_type": "UNAUTHORIZED_ACCESS",
            "severity": "HIGH",
            "confidence": 0.82,
            "description": "Unauthorized access attempt detected",
            "color": LABEL_COLORS["UNAUTHORIZED_ACCESS"],
        }

    if any(k in msg for k in [
        "data exfil", "large upload", "wget", "curl http",
        "base64", "outbound", "transfer", "exfiltrat",
    ]):
        return {
            "threat_type": "DATA_EXFILTRATION",
            "severity": "HIGH",
            "confidence": 0.78,
            "description": "Possible data exfiltration detected",
            "color": LABEL_COLORS["DATA_EXFILTRATION"],
        }

    return {
        "threat_type": "NORMAL",
        "severity": "LOW",
        "confidence": 0.96,
        "description": "Normal log activity",
        "color": LABEL_COLORS["NORMAL"],
    }
