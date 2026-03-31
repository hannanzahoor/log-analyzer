# 🛡️ Intelligent Linux Log Analyzer

An advanced log analysis system that uses **machine learning + NLP techniques** to automatically detect cybersecurity threats from Linux system logs.

---

## 🚀 Overview

This project analyzes raw Linux logs and detects security threats such as:

* 🔴 Brute-force attacks
* 🟠 Port scans
* 🔴 DDoS attacks
* 🔴 Unauthorized access
* 🔴 Data exfiltration
* 🟡 Zero-day anomalies (via clustering)

It combines **log parsing, feature extraction, supervised ML, and anomaly detection** into a single pipeline with a web-based dashboard.

---

## 🧠 Key Features

* ⚡ Real-time log ingestion and analysis
* 🤖 Machine Learning-based threat detection
* 🔍 NLP-based semantic feature extraction (TF-IDF + LSA)
* 🧩 Anomaly detection using DBSCAN
* 🌐 REST API backend with Flask
* 📊 Interactive dashboard using React + Chart.js
* 💾 MongoDB storage for logs and alerts

---

## 🏗️ System Architecture

```
Raw Logs
   ↓
Drain Parser (custom)
   ↓
TF-IDF + Truncated SVD (LSA)
   ↓
├── Random Forest / SVM → Known Threat Detection
└── DBSCAN → Anomaly Detection
   ↓
Flask API → MongoDB
   ↓
React Dashboard (Visualization)
```

---

## ⚙️ Tech Stack

### Backend

* Python 3.14
* Flask + Flask-CORS
* Scikit-learn
* MongoDB (PyMongo)
* Joblib
* Pandas, NumPy

### Frontend

* React 18
* React Router v6
* Chart.js
* Axios

---

## 🎯 Threat Detection Capabilities

| Threat Type         | Severity | Method    |
| ------------------- | -------- | --------- |
| BRUTE_FORCE         | HIGH     | Rule + ML |
| PORT_SCAN           | MEDIUM   | Rule + ML |
| DDOS                | CRITICAL | Rule + ML |
| UNAUTHORIZED_ACCESS | HIGH     | Rule + ML |
| DATA_EXFILTRATION   | HIGH     | Rule + ML |
| ANOMALY             | MEDIUM   | DBSCAN    |
| NORMAL              | LOW      | Default   |

---

## 📊 Performance

* ✅ F1 Score: **> 0.90**
* ⚡ Lightweight (no PyTorch required)
* ⚙️ Fully compatible with Python 3.14

---

## 🔄 Why This Approach?

Instead of heavy deep learning models like BERT, this project uses:

* **TF-IDF + LSA** → Efficient semantic understanding
* **Random Forest + SVM** → Reliable classification
* **DBSCAN** → Detects unseen attack patterns

This makes the system:

* Faster ⚡
* Lightweight 💡
* Easier to deploy 🚀

---

## ▶️ How to Run the Project

### 🧩 Prerequisites

* Python 3.14
* Node.js (v18+)
* MongoDB running locally

---

### 🔧 Step 1 — Start MongoDB

```bash
net start MongoDB
```

OR using Docker:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7.0
```

---

### ⚙️ Step 2 — Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt

copy .env.example .env
```

👉 Edit `.env` with your MongoDB URI

Then run:

```bash
python app.py
```

---

### 🌐 Step 3 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

---

### 🌍 Open in Browser

```
http://localhost:3000
```

Click **⚡ Simulate Logs** to test the system.

---

## 📱 Frontend Pages

* 📊 Dashboard — Overview + charts
* 📥 Log Ingestion — Submit logs
* 📜 Logs — View processed logs
* 🚨 Alerts — Manage security alerts
* 🤖 ML Analysis — Train/test models

---

## 🔐 Security Best Practices

This repository does NOT include:

* ❌ `.env` files
* ❌ API keys or secrets
* ❌ Real system logs

Use `.env.example` as a template for configuration.

---

## 📂 Project Structure

```
log-analyzer/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── ml/
│   ├── utils/
│   ├── requirements.txt
│   ├── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│
├── README.md
├── LICENSE
├── .gitignore
```

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork this repo and submit pull requests.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Hanan Zahoor**  
- GitHub: https://github.com/hannanzahoor  
- LinkedIn: https://linkedin.com/in/hananzahoor

Developed as a cybersecurity + machine learning project for intelligent threat detection.

---
