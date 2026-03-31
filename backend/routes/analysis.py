from flask import Blueprint, request, jsonify
from services.classifier import ThreatClassifier, AnomalyDetector, ATTACK_LABELS, rule_based_classify
from services.log_parser import LogParser
import numpy as np
import os

analysis_bp = Blueprint("analysis", __name__)
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")


@analysis_bp.route("/train", methods=["POST"])
def train_model():
    """Train classifiers on synthetic data"""
    data = request.get_json() or {}
    model_type = data.get("model_type", "random_forest")
    n_samples = int(data.get("n_samples", 1000))

    labels = list(ATTACK_LABELS.values())
    np.random.seed(42)
    n_per_class = n_samples // len(labels)

    X_list, y_list = [], []
    for label in labels:
        center = np.random.randn(128) * 3
        noise = np.random.randn(n_per_class, 128) * 0.8
        X_list.append(center + noise)
        y_list.extend([label] * n_per_class)

    X = np.vstack(X_list).astype(np.float32)
    y = np.array(y_list)
    idx = np.random.permutation(len(y))
    X, y = X[idx], y[idx]

    clf = ThreatClassifier(model_type=model_type)
    clf.train(X, y)

    # Also fit the TF-IDF embedder on sample texts
    from services.embedder import fit_vectorizer
    sample_texts = [
        "Failed password for root from 192.168.1.100 port 22",
        "Accepted publickey for admin from 10.0.0.5",
        "Possible SYN flooding on port 80",
        "Invalid user hacker from 10.10.10.10",
        "pam_unix authentication failure user root",
        "sudo command executed by bob",
        "UFW BLOCK IN eth0 SRC 203.0.113.5 TCP DPT 22",
        "kernel oom kill process apache2",
        "access denied for user root mysql",
        "wget http malicious payload download",
    ] * (n_samples // 10)
    fit_vectorizer(sample_texts)

    return jsonify({
        "status": "trained",
        "model_type": model_type,
        "samples": len(X),
        "classes": labels,
        "message": "Model trained successfully on synthetic data",
    }), 200


@analysis_bp.route("/classify", methods=["POST"])
def classify_log():
    data = request.get_json() or {}
    message = data.get("message", "")
    if not message:
        return jsonify({"error": "Missing message"}), 400
    parser = LogParser()
    parsed = parser.parse_line(message)
    classification = rule_based_classify(parsed)
    return jsonify({"message": message, "parsed": parsed, "classification": classification}), 200


@analysis_bp.route("/model/status", methods=["GET"])
def model_status():
    return jsonify({
        "random_forest": os.path.exists(os.path.join(MODEL_DIR, "random_forest_model.joblib")),
        "svm": os.path.exists(os.path.join(MODEL_DIR, "svm_model.joblib")),
        "dbscan": os.path.exists(os.path.join(MODEL_DIR, "dbscan_model.joblib")),
        "tfidf": os.path.exists(os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")),
    }), 200


@analysis_bp.route("/templates", methods=["GET"])
def get_templates():
    from services.analysis_pipeline import log_parser
    templates = log_parser.get_templates()
    return jsonify({"templates": templates, "count": len(templates)}), 200
