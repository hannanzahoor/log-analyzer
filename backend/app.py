"""
Intelligent Linux System Log Analyzer
Flask Application - Python 3.14 Compatible
"""

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
    app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    app.config["DB_NAME"] = os.getenv("DB_NAME", "log_analyzer")

    from routes.logs import logs_bp
    from routes.analysis import analysis_bp
    from routes.alerts import alerts_bp
    from routes.dashboard import dashboard_bp

    app.register_blueprint(logs_bp, url_prefix="/api/logs")
    app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
    app.register_blueprint(alerts_bp, url_prefix="/api/alerts")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("FLASK_PORT", 5000))
    print(f"\n  Log Analyzer Backend running on http://localhost:{port}\n")
    app.run(debug=True, host="0.0.0.0", port=port)
