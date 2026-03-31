"""
Log Parser - Pure Python Drain3-style template mining
No external drain3 package required - works on Python 3.14
"""

import re
from datetime import datetime


# ─── Drain3-style Template Miner (pure Python) ────────────────────────────────

class LogCluster:
    def __init__(self, cluster_id: int, template_tokens: list):
        self.cluster_id = cluster_id
        self.template_tokens = template_tokens
        self.size = 1

    def get_template(self) -> str:
        return " ".join(self.template_tokens)


class DrainParser:
    """
    Simplified Drain algorithm for log template mining.
    Groups similar log messages into templates, replacing variable
    parts with <*> wildcards.
    """

    def __init__(self, sim_threshold: float = 0.4, max_clusters: int = 200):
        self.sim_threshold = sim_threshold
        self.max_clusters = max_clusters
        self.clusters: list[LogCluster] = []
        self._next_id = 1
        # Regex patterns for common variables
        self._var_patterns = [
            (re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b'), '<IP>'),
            (re.compile(r'\b[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}\b'), '<MAC>'),
            (re.compile(r'\b\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?\b'), '<DATE>'),
            (re.compile(r'\b\d{2}:\d{2}:\d{2}\b'), '<TIME>'),
            (re.compile(r'\[\d+\]'), '[<PID>]'),
            (re.compile(r'\b\d+\b'), '<NUM>'),
            (re.compile(r'port\s+\d+'), 'port <NUM>'),
        ]

    def _tokenize(self, message: str) -> list:
        return message.split()

    def _preprocess(self, message: str) -> str:
        """Normalize variable parts before matching"""
        s = message
        for pattern, replacement in self._var_patterns:
            s = pattern.sub(replacement, s)
        return s

    def _similarity(self, tokens_a: list, tokens_b: list) -> float:
        if len(tokens_a) != len(tokens_b):
            return 0.0
        matches = sum(1 for a, b in zip(tokens_a, tokens_b) if a == b or a == '<*>' or b == '<*>')
        return matches / len(tokens_a)

    def _merge_template(self, existing: list, new_tokens: list) -> list:
        return [a if a == b else '<*>' for a, b in zip(existing, new_tokens)]

    def add_log_message(self, message: str) -> dict:
        normalized = self._preprocess(message)
        tokens = self._tokenize(normalized)

        best_cluster = None
        best_sim = -1

        for cluster in self.clusters:
            if len(cluster.template_tokens) != len(tokens):
                continue
            sim = self._similarity(cluster.template_tokens, tokens)
            if sim > best_sim:
                best_sim = sim
                best_cluster = cluster

        if best_cluster and best_sim >= self.sim_threshold:
            best_cluster.template_tokens = self._merge_template(
                best_cluster.template_tokens, tokens
            )
            best_cluster.size += 1
            return {
                "cluster_id": best_cluster.cluster_id,
                "template_mined": best_cluster.get_template(),
            }
        else:
            if len(self.clusters) < self.max_clusters:
                new_cluster = LogCluster(self._next_id, tokens)
                self._next_id += 1
                self.clusters.append(new_cluster)
                return {
                    "cluster_id": new_cluster.cluster_id,
                    "template_mined": new_cluster.get_template(),
                }
            return {"cluster_id": -1, "template_mined": message}


# ─── Main Log Parser ──────────────────────────────────────────────────────────

class LogParser:
    def __init__(self):
        self.drain = DrainParser(sim_threshold=0.4)

        self.patterns = {
            "timestamp": re.compile(r'(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})'),
            "hostname": re.compile(r'\d{2}:\d{2}:\d{2}\s+(\S+)'),
            "process": re.compile(r'(\w[\w.-]*(?:\[\d+\])?)\s*:'),
            "ip_address": re.compile(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b'),
            "port": re.compile(r'port\s+(\d+)'),
            "user": re.compile(r'(?:user|for)\s+(\w+)', re.IGNORECASE),
            "pid": re.compile(r'\[(\d+)\]'),
        }

    def parse_line(self, raw_log: str) -> dict:
        result = {
            "raw": raw_log,
            "timestamp": None,
            "hostname": None,
            "process": None,
            "message": raw_log,
            "ip_addresses": [],
            "ports": [],
            "users": [],
            "template": None,
            "template_id": None,
            "parsed_at": datetime.utcnow().isoformat(),
        }

        try:
            m = self.patterns["timestamp"].search(raw_log)
            if m:
                result["timestamp"] = m.group(1)

            m = self.patterns["hostname"].search(raw_log)
            if m:
                result["hostname"] = m.group(1)

            m = self.patterns["process"].search(raw_log)
            if m:
                result["process"] = m.group(1)

            result["ip_addresses"] = self.patterns["ip_address"].findall(raw_log)
            result["ports"] = self.patterns["port"].findall(raw_log)
            result["users"] = self.patterns["user"].findall(raw_log)

            msg_m = re.search(r':\s*(.+)$', raw_log)
            if msg_m:
                result["message"] = msg_m.group(1).strip()

            cluster = self.drain.add_log_message(result["message"])
            result["template"] = cluster["template_mined"]
            result["template_id"] = cluster["cluster_id"]

        except Exception as e:
            result["parse_error"] = str(e)

        return result

    def parse_batch(self, lines: list) -> list:
        return [self.parse_line(l) for l in lines if l.strip()]

    def get_templates(self) -> list:
        return [
            {"id": c.cluster_id, "template": c.get_template(), "count": c.size}
            for c in self.drain.clusters
        ]


def categorize_log(message: str) -> str:
    m = message.lower()
    if any(k in m for k in ["failed", "failure", "invalid user", "authentication failure"]):
        return "AUTH_FAILURE"
    if any(k in m for k in ["accepted", "session opened", "logged in"]):
        return "AUTH_SUCCESS"
    if any(k in m for k in ["connection", "tcp", "udp", "ufw"]):
        return "NETWORK"
    if any(k in m for k in ["error", "crit", "emerg"]):
        return "ERROR"
    if any(k in m for k in ["warning", "warn"]):
        return "WARNING"
    if any(k in m for k in ["sudo", "su:", "privilege"]):
        return "PRIVILEGE"
    if any(k in m for k in ["kernel", "oom", "segfault"]):
        return "KERNEL"
    return "INFO"
