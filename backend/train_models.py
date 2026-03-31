"""
ML Model Training Script — Python 3.14 Compatible
Run: python train_models.py

Trains:
  - TF-IDF + TruncatedSVD feature extractor
  - Random Forest classifier
  - SVM classifier
  - DBSCAN anomaly detector
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from services.classifier import ThreatClassifier, AnomalyDetector, ATTACK_LABELS
from services.embedder import fit_vectorizer, get_batch_embeddings
import argparse

LABELS = list(ATTACK_LABELS.values())

# Representative sample log messages per attack type for TF-IDF training
SAMPLE_CORPUS = {
    "NORMAL": [
        "session opened for user deploy by root", "Accepted publickey for admin from 10.0.0.5",
        "Started Daily apt download activities", "cron CMD backup.sh executed",
        "systemd started cleanup service", "pam_unix session closed for user bob",
        "Received disconnect from 192.168.1.50 disconnected by user",
    ],
    "BRUTE_FORCE": [
        "Failed password for root from 192.168.1.100 port 22 ssh2",
        "Failed password for admin from 203.0.113.42 port 22 ssh2",
        "Invalid user oracle from 185.220.101.3", "authentication failure user root",
        "maximum authentication attempts exceeded for root",
        "Too many authentication failures from 10.10.10.10",
        "Failed password for invalid user pi from 45.33.32.156",
    ],
    "PORT_SCAN": [
        "connection refused from 198.51.100.5 port 8080",
        "multiple ports accessed from 203.0.113.10",
        "nmap scan detected from 10.10.10.50", "port sweep from 192.168.50.1",
        "UFW BLOCK TCP DPT 3306 SRC 203.0.113.5",
        "portscan alert multiple connection refused",
    ],
    "DDOS": [
        "Possible SYN flooding on port 80 Sending cookies",
        "iptables connection tracking table full dropping packet",
        "rate limit exceeded on eth0 dropping packets",
        "bandwidth threshold exceeded inbound traffic spike",
        "syn flood detected on port 443",
        "kernel net ipv4 tcp syncookies enabled ddos mitigation",
    ],
    "UNAUTHORIZED_ACCESS": [
        "sudo pam authentication failure user www-data",
        "permission denied accessing restricted directory",
        "access denied for user root mysql 198.51.100.20",
        "unauthorized access attempt to admin panel",
        "root login refused from external IP",
        "forbidden path traversal attempt detected",
    ],
    "DATA_EXFILTRATION": [
        "wget http malicious example com payload",
        "large data transfer outbound 1GB to 203.0.113.100",
        "curl base64 encoded data sent to external server",
        "unusual outbound transfer detected on port 4444",
        "data exfiltration attempt via DNS tunneling",
        "audit execve wget quiet malicious url",
    ],
    "ANOMALY": [
        "device eth0 entered promiscuous mode",
        "kernel out of memory kill process apache2 score 900",
        "unknown binary executed from tmp directory",
        "unexpected process spawned by apache user",
        "unusual cron job added by non-root user",
        "unrecognized network protocol detected",
    ],
}


def build_training_data():
    """Build training corpus from sample messages"""
    all_texts = []
    all_labels = []
    for label, texts in SAMPLE_CORPUS.items():
        # Oversample each class for better training
        expanded = texts * 20  # repeat 20 times
        all_texts.extend(expanded)
        all_labels.extend([label] * len(expanded))
    return all_texts, all_labels


def main():
    parser = argparse.ArgumentParser(description="Train Log Analyzer ML Models")
    parser.add_argument("--skip-svm", action="store_true", help="Skip SVM (faster)")
    args = parser.parse_args()

    print("=" * 60)
    print("  Log Analyzer — Model Training (Python 3.14 Compatible)")
    print("=" * 60)

    # Step 1: Fit TF-IDF embedder
    print("\n[1/4] Fitting TF-IDF + SVD embedder...")
    texts, labels = build_training_data()
    fit_vectorizer(texts, n_components=128)
    print(f"  Fitted on {len(texts)} log samples")

    # Step 2: Generate embeddings
    print("\n[2/4] Generating embeddings...")
    X = get_batch_embeddings(texts)
    y = np.array(labels)
    print(f"  Embeddings shape: {X.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Step 3: Train Random Forest
    print("\n[3/4] Training Random Forest...")
    rf = ThreatClassifier(model_type="random_forest")
    rf.train(X_train, y_train)
    preds = rf.predict(X_test)
    print("\n  Random Forest Results:")
    print(classification_report(y_test, preds, labels=LABELS, zero_division=0))

    # Step 4: Train SVM (optional)
    if not args.skip_svm:
        print("\n[4/4] Training SVM...")
        svm = ThreatClassifier(model_type="svm")
        svm.train(X_train, y_train)
        preds_svm = svm.predict(X_test)
        print("\n  SVM Results:")
        print(classification_report(y_test, preds_svm, labels=LABELS, zero_division=0))
    else:
        print("\n[4/4] Skipping SVM (--skip-svm)")

    # Train DBSCAN anomaly detector
    print("\n[+] Training DBSCAN anomaly detector...")
    ad = AnomalyDetector()
    ad.fit(X_train)

    print("\n" + "=" * 60)
    print("  Training Complete! Models saved to ml/models/")
    print("=" * 60)


if __name__ == "__main__":
    main()
