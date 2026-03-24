# Sentinel AI

**Sentinel AI** is a comprehensive, multi-layer AI-powered Fraud Detection and Prevention platform. It is designed to detect, analyze, and prevent fraudulent transactions (e.g., UPI fraud) in real-time using a combination of machine learning models, behavioral profiling, network graph analysis, and explainable AI (XAI).

---

## Features

- **Real-Time Risk Scoring**: Uses an XGBoost model to assign a risk score to incoming transactions instantly.
- **Behavioral Profiling**: Builds and tracks user transaction behavior profiles to identify anomalies and deviations from normal patterns.
- **Fraud Ring Detection (Graph Analysis)**: Utilizes NetworkX and Louvain community detection to uncover complex fraud rings and interconnected fraudulent accounts.
- **Fraud Forecasting**: Predicts future fraud trends based on historical data.
- **Explainable AI (XAI)**: Integrates SHAP (SHapley Additive exPlanations) to provide transparent and interpretable reasons for why a transaction was flagged as high risk.
- **Modern Interactive Dashboard**: A sleek, responsive dashboard built with React, Tailwind CSS, and shadcn/ui to visualize fraud metrics, alerts, and user profiles.

---

## Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **TypeScript**: Strictly typed for better maintainability.
- **Styling**: Tailwind CSS, shadcn/ui
- **Icons & Animations**: Lucide React, Framer Motion
- **Charts**: Recharts

### Backend
- **Framework**: FastAPI (Python)
- **Machine Learning**: XGBoost, Scikit-Learn
- **Graph Analytics**: NetworkX, python-louvain
- **Explainability**: SHAP
- **Data Processing**: Pandas, NumPy

---

## Getting Started

Follow these steps to set up and run Sentinel AI on your local machine.

### Prerequisites
- **Node.js**: (v18+ recommended)
- **Python**: (v3.10+ recommended)

### 1. Clone the repository

```bash
git clone <repository-url>
cd sentinel-ai
```

### 2. Setup Backend

Navigate to the backend directory, create a virtual environment, and install dependencies.

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python main.py
```
*The FastAPI backend will run on `http://localhost:8000` and automatically generate/load the transaction dataset and train the ML models on startup.*

### 3. Setup Frontend

Open a new terminal, navigate to the project root, install dependencies, and start the development server.

```bash
# From the project root
npm install

# Start the Vite development server
npm run dev
```
*The React frontend will be accessible at `http://localhost:5173`.*

---

## Project Structure

```text
sentinel-ai/
├── backend/
│   ├── api/               # FastAPI route definitions
│   ├── data/              # Dataset generation and storage
│   ├── models/            # ML models (Risk Scorer, Graph Analyzer, etc.)
│   ├── main.py            # FastAPI entry point & initialization
│   └── requirements.txt   # Python dependencies
├── src/
│   ├── components/        # Reusable React components (shadcn/ui)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Main application pages/views
│   ├── lib/               # Utility functions
│   ├── App.tsx            # Main React component
│   └── main.tsx           # React DOM rendering entry point
├── package.json           # Frontend dependencies and scripts
├── tailwind.config.ts     # Tailwind CSS configuration
└── README.md              # Project documentation
```