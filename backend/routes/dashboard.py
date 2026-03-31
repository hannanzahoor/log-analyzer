from flask import Blueprint, jsonify
from services.alert_service import get_alert_stats
from services.analysis_pipeline import get_log_stats
from utils.database import get_collection
from datetime import datetime, timedelta

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
def summary():
    return jsonify({
        "logs": get_log_stats(),
        "alerts": get_alert_stats(),
        "timestamp": datetime.utcnow().isoformat(),
    }), 200


@dashboard_bp.route("/timeline", methods=["GET"])
def timeline():
    try:
        col = get_collection("alerts")
        now = datetime.utcnow()
        data = []
        for i in range(23, -1, -1):
            start = now - timedelta(hours=i + 1)
            end = now - timedelta(hours=i)
            count = col.count_documents({
                "timestamp": {"$gte": start.isoformat(), "$lt": end.isoformat()}
            })
            data.append({"hour": start.strftime("%H:00"), "count": count})
        return jsonify({"timeline": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/threat-distribution", methods=["GET"])
def threat_distribution():
    try:
        col = get_collection("logs")
        pipeline = [
            {"$match": {"threat_detected": True}},
            {"$group": {"_id": "$classification.threat_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        COLORS = {
            "BRUTE_FORCE": "#ef4444", "PORT_SCAN": "#f97316",
            "DDOS": "#dc2626", "UNAUTHORIZED_ACCESS": "#a855f7",
            "DATA_EXFILTRATION": "#ec4899", "ANOMALY": "#eab308",
        }
        dist = [
            {"name": d["_id"] or "UNKNOWN", "value": d["count"],
             "color": COLORS.get(d["_id"], "#6b7280")}
            for d in col.aggregate(pipeline)
        ]
        return jsonify({"distribution": dist}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/top-ips", methods=["GET"])
def top_ips():
    try:
        col = get_collection("alerts")
        pipeline = [
            {"$unwind": "$source_ips"},
            {"$group": {"_id": "$source_ips", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        data = [{"ip": d["_id"], "count": d["count"]} for d in col.aggregate(pipeline)]
        return jsonify({"top_ips": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dashboard_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()}), 200
