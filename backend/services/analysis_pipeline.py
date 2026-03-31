"""
Log Analysis Pipeline
Parse → Embed → Classify → Alert → Store
"""

from datetime import datetime
from services.log_parser import LogParser, categorize_log
from services.classifier import ThreatClassifier, AnomalyDetector, rule_based_classify, SEVERITY_MAP
from services.alert_service import create_alert
from utils.database import get_collection

# Singletons
log_parser = LogParser()
rf_classifier = ThreatClassifier(model_type="random_forest")
anomaly_detector = AnomalyDetector()


def analyze_log_line(raw_log: str, use_ml: bool = False) -> dict:
    """Full pipeline for one log line"""

    # 1. Parse
    parsed = log_parser.parse_line(raw_log)
    parsed["category"] = categorize_log(parsed.get("message", ""))

    # 2. Classify
    if use_ml and rf_classifier.is_trained:
        try:
            from services.embedder import get_embedding
            embedding = get_embedding(parsed["message"])
            classification = rf_classifier.predict_proba(embedding)
            classification["threat_type"] = classification.get("label", "NORMAL")
            classification["severity"] = SEVERITY_MAP.get(classification["threat_type"], "LOW")

            # Check anomaly
            if anomaly_detector.is_fitted:
                anomaly = anomaly_detector.detect(embedding)
                if anomaly and anomaly[0]["is_anomaly"]:
                    classification["threat_type"] = "ANOMALY"
                    classification["severity"] = "MEDIUM"
                    classification["is_anomaly"] = True
        except Exception as e:
            print(f"[Pipeline] ML error: {e}, using rules.")
            classification = rule_based_classify(parsed)
    else:
        classification = rule_based_classify(parsed)

    # 3. Build log entry
    log_entry = {
        **parsed,
        "classification": classification,
        "threat_detected": classification.get("threat_type", "NORMAL") != "NORMAL",
        "analyzed_at": datetime.utcnow().isoformat(),
    }

    # 4. Store in MongoDB
    try:
        col = get_collection("logs")
        result = col.insert_one(log_entry)
        log_entry["_id"] = str(result.inserted_id)
    except Exception as e:
        log_entry["db_error"] = str(e)

    # 5. Generate alert if threat found
    alert = None
    threat_type = classification.get("threat_type", "NORMAL")
    if threat_type not in ("NORMAL", "INFO"):
        severity = classification.get("severity", SEVERITY_MAP.get(threat_type, "MEDIUM"))
        alert = create_alert(
            threat_type=threat_type,
            severity=severity,
            message=parsed.get("message", raw_log),
            source_log={"raw": raw_log, "parsed_at": parsed.get("parsed_at")},
            confidence=classification.get("confidence", 0.0),
            source_ips=parsed.get("ip_addresses", []),
            description=classification.get("description", ""),
        )
        log_entry["alert_id"] = alert.get("alert_id")

    return {
        "log": log_entry,
        "classification": classification,
        "alert": alert,
        "threat_detected": log_entry["threat_detected"],
    }


def analyze_batch(log_lines: list, use_ml: bool = False) -> dict:
    results = []
    threats = 0
    alerts = 0
    for line in log_lines:
        if line.strip():
            r = analyze_log_line(line.strip(), use_ml=use_ml)
            results.append(r)
            if r["threat_detected"]:
                threats += 1
            if r["alert"]:
                alerts += 1
    return {
        "total_processed": len(results),
        "threats_found": threats,
        "alerts_generated": alerts,
        "results": results,
    }


def get_log_stats() -> dict:
    try:
        col = get_collection("logs")
        total = col.count_documents({})
        threats = col.count_documents({"threat_detected": True})
        by_type = list(col.aggregate([
            {"$group": {"_id": "$classification.threat_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]))
        by_cat = list(col.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        ]))
        return {
            "total_logs": total,
            "total_threats": threats,
            "normal_logs": total - threats,
            "by_threat_type": by_type,
            "by_category": by_cat,
        }
    except Exception as e:
        return {"total_logs": 0, "total_threats": 0, "error": str(e)}
