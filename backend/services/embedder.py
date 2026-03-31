"""
Feature Extractor using TF-IDF + TruncatedSVD (LSA)
Replaces DistilBERT for Python 3.14 compatibility.

Produces 128-dim semantic vectors from log messages.
TF-IDF + LSA is well-established for log analysis and
achieves strong F1 scores on structured text like logs.
"""

import numpy as np
import joblib
import os
import re

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")

_vectorizer = None
_svd = None
_fitted = False


def _get_models():
    global _vectorizer, _svd, _fitted
    if not _fitted:
        vec_path = os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib")
        svd_path = os.path.join(MODEL_DIR, "svd_transform.joblib")
        if os.path.exists(vec_path) and os.path.exists(svd_path):
            _vectorizer = joblib.load(vec_path)
            _svd = joblib.load(svd_path)
            _fitted = True
    return _vectorizer, _svd, _fitted


def preprocess(text: str) -> str:
    """Normalize log message for vectorization"""
    text = text.lower()
    # Replace IPs with token
    text = re.sub(r'\d{1,3}(\.\d{1,3}){3}', ' IPADDR ', text)
    # Replace ports
    text = re.sub(r'port\s+\d+', ' PORT ', text)
    # Replace PIDs
    text = re.sub(r'\[\d+\]', ' PID ', text)
    # Replace numbers
    text = re.sub(r'\b\d+\b', ' NUM ', text)
    # Keep alphanumeric + spaces
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_embedding(text: str) -> np.ndarray:
    """Get 128-dim embedding for a single log message"""
    vec, svd, fitted = _get_models()
    if not fitted:
        # Return a basic heuristic vector if model not trained yet
        return _heuristic_embedding(text)

    processed = preprocess(text)
    tfidf_vec = vec.transform([processed])
    embedding = svd.transform(tfidf_vec)[0]
    return embedding.astype(np.float32)


def get_batch_embeddings(texts: list) -> np.ndarray:
    """Get embeddings for a list of log messages"""
    vec, svd, fitted = _get_models()
    if not fitted:
        return np.vstack([_heuristic_embedding(t) for t in texts])

    processed = [preprocess(t) for t in texts]
    tfidf_vecs = vec.transform(processed)
    embeddings = svd.transform(tfidf_vecs)
    return embeddings.astype(np.float32)


def fit_vectorizer(texts: list, n_components: int = 128):
    """Fit TF-IDF + SVD on a corpus of log messages"""
    global _vectorizer, _svd, _fitted
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.decomposition import TruncatedSVD
    from sklearn.pipeline import Pipeline

    processed = [preprocess(t) for t in texts]

    _vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
    )
    tfidf_matrix = _vectorizer.fit_transform(processed)

    actual_components = min(n_components, tfidf_matrix.shape[1] - 1, tfidf_matrix.shape[0] - 1)
    _svd = TruncatedSVD(n_components=actual_components, random_state=42)
    _svd.fit(tfidf_matrix)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(_vectorizer, os.path.join(MODEL_DIR, "tfidf_vectorizer.joblib"))
    joblib.dump(_svd, os.path.join(MODEL_DIR, "svd_transform.joblib"))
    _fitted = True
    print(f"[Embedder] TF-IDF+SVD fitted on {len(texts)} texts, {actual_components} components")
    return _vectorizer, _svd


def _heuristic_embedding(text: str) -> np.ndarray:
    """Fallback: keyword-based 32-dim feature vector when model not trained"""
    keywords = [
        "failed", "error", "invalid", "denied", "refused", "blocked",
        "accepted", "success", "opened", "connected", "login",
        "sudo", "root", "privilege", "permission", "unauthorized",
        "ssh", "port", "tcp", "udp", "connection", "network",
        "kernel", "memory", "cpu", "disk", "process",
        "warning", "critical", "alert", "panic", "flood",
        "scan", "brute", "ddos", "exfil", "malware",
    ]
    text_lower = text.lower()
    vec = np.array([1.0 if kw in text_lower else 0.0 for kw in keywords], dtype=np.float32)
    # Pad to 32 dims
    if len(vec) < 32:
        vec = np.pad(vec, (0, 32 - len(vec)))
    return vec[:32]
