"""
Sentinel AI — FastAPI Backend Entry Point
Initializes all ML models and serves the API.
"""
import sys
import os

# Ensure backend dir is on the path
sys.path.insert(0, os.path.dirname(__file__))

# Load .env for Twilio / SMTP credentials
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.routes import router as api_router
from api import routes
from data.generate_dataset import get_dataset
from models.risk_scorer import RiskScorer
from models.behavioral_profiler import BehavioralProfiler
from models.graph_analyzer import GraphAnalyzer
from models.fraud_forecaster import FraudForecaster

app = FastAPI(
    title="Sentinel AI",
    description="Multi-layer AI-powered UPI Fraud Detection & Prevention Platform",
    version="1.0.0",
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup():
    """Initialize dataset and train all models on startup."""
    print("=" * 60)
    print("  Sentinel AI — Initializing Fraud Intelligence Platform")
    print("=" * 60)

    # 1. Generate / load dataset
    print("\n[1/5] Loading dataset...")
    df = get_dataset()
    routes.dataset = df
    print(f"  ✓ {len(df)} transactions loaded, {df['is_fraud'].sum()} fraud cases ({df['is_fraud'].mean():.2%} fraud rate)")

    # 2. Train risk scorer
    print("\n[2/5] Training XGBoost risk scorer...")
    scorer = RiskScorer()
    if not scorer.load():
        scorer.train(df)
    else:
        print("  ✓ Loaded pre-trained model")
    routes.risk_scorer = scorer

    # 3. Build behavioral profiles
    print("\n[3/5] Building behavioral profiles...")
    profiler = BehavioralProfiler()
    profiler.build_profiles(df)
    routes.behavioral_profiler = profiler

    # 4. Build fraud graph
    print("\n[4/5] Building fraud network graph...")
    graph = GraphAnalyzer()
    graph.build_graph(df)
    routes.graph_analyzer = graph

    # 5. Train forecaster
    print("\n[5/5] Training fraud forecaster...")
    forecaster = FraudForecaster()
    forecaster.train(df)
    routes.fraud_forecaster = forecaster

    print("\n" + "=" * 60)
    print("  ✓ All systems initialized. API ready.")
    print("=" * 60)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Sentinel AI", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
