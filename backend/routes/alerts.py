from flask import Blueprint, request, jsonify
from services.alert_service import get_recent_alerts, acknowledge_alert, resolve_alert, get_alert_stats

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/", methods=["GET"])
def get_alerts():
    limit = int(request.args.get("limit", 50))
    severity = request.args.get("severity") or None
    alerts = get_recent_alerts(limit=limit, severity_filter=severity)
    return jsonify({"alerts": alerts, "count": len(alerts)}), 200


@alerts_bp.route("/stats", methods=["GET"])
def alert_stats():
    return jsonify(get_alert_stats()), 200


@alerts_bp.route("/<alert_id>/acknowledge", methods=["POST"])
def ack(alert_id):
    return jsonify({"success": acknowledge_alert(alert_id), "alert_id": alert_id}), 200


@alerts_bp.route("/<alert_id>/resolve", methods=["POST"])
def resolve(alert_id):
    return jsonify({"success": resolve_alert(alert_id), "alert_id": alert_id}), 200
