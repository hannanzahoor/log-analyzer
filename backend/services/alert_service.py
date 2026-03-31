"""Alert Generation and Management Service"""

from datetime import datetime
from utils.database import get_collection

SEVERITY_COLORS = {
    "CRITICAL": "#dc2626",
    "HIGH": "#ef4444",
    "MEDIUM": "#f97316",
    "LOW": "#eab308",
    "INFO": "#6b7280",
}

SEVERITY_LEVELS = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}


def create_alert(threat_type, severity, message, source_log,
                 confidence=0.0, source_ips=None, description=""):
    alert = {
        "alert_id": f"ALT-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}",
        "threat_type": threat_type,
        "severity": severity,
        "severity_level": SEVERITY_LEVELS.get(severity, 0),
        "severity_color": SEVERITY_COLORS.get(severity, "#6b7280"),
        "message": message,
        "description": description,
        "confidence": confidence,
        "source_ips": source_ips or [],
        "source_log": source_log,
        "timestamp": datetime.utcnow().isoformat(),
        "acknowledged": False,
        "resolved": False,
    }
    try:
        col = get_collection("alerts")
        result = col.insert_one(alert)
        alert["_id"] = str(result.inserted_id)
    except Exception as e:
        alert["db_error"] = str(e)
    return alert


def get_recent_alerts(limit=50, severity_filter=None):
    try:
        col = get_collection("alerts")
        query = {}
        if severity_filter:
            query["severity"] = severity_filter
        docs = []
        for doc in col.find(query).sort("timestamp", -1).limit(limit):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs
    except Exception as e:
        print(f"[AlertService] {e}")
        return []


def acknowledge_alert(alert_id):
    try:
        col = get_collection("alerts")
        r = col.update_one(
            {"alert_id": alert_id},
            {"$set": {"acknowledged": True, "acknowledged_at": datetime.utcnow().isoformat()}},
        )
        return r.modified_count > 0
    except:
        return False


def resolve_alert(alert_id):
    try:
        col = get_collection("alerts")
        r = col.update_one(
            {"alert_id": alert_id},
            {"$set": {"resolved": True, "resolved_at": datetime.utcnow().isoformat()}},
        )
        return r.modified_count > 0
    except:
        return False


def get_alert_stats():
    try:
        col = get_collection("alerts")
        pipeline = [{"$group": {"_id": "$threat_type", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
        return {
            "total": col.count_documents({}),
            "unresolved": col.count_documents({"resolved": False}),
            "critical": col.count_documents({"severity": "CRITICAL"}),
            "high": col.count_documents({"severity": "HIGH"}),
            "by_type": list(col.aggregate(pipeline)),
        }
    except:
        return {"total": 0, "unresolved": 0, "critical": 0, "high": 0, "by_type": []}
