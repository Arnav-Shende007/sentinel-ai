"""
Layer 1 — Transaction Risk Scoring Engine
XGBoost classifier trained on synthetic data.
"""
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
)
import shap
import os
import pickle

MODEL_FEATURES = [
    "amount_log",
    "amount_zscore",
    "hour",
    "is_night",
    "is_weekend",
    "device_changed",
    "is_new_recipient",
    "geo_distance_km",
    "txn_count_daily",
    "day_of_week",
]


class RiskScorer:
    def __init__(self):
        self.model = None
        self.explainer = None
        self.metrics = {}
        self.threshold = 0.5
        self._model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data_cache", "risk_model.pkl")

    def train(self, df: pd.DataFrame):
        """Train XGBoost on the featured dataset."""
        X = df[MODEL_FEATURES].copy()
        y = df["is_fraud"].astype(int)

        # Convert boolean columns to int
        for col in X.columns:
            if X[col].dtype == bool:
                X[col] = X[col].astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y,
        )

        # Scale positive weight to handle imbalance
        scale_pos = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

        self.model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=scale_pos,
            eval_metric="logloss",
            random_state=42,
            use_label_encoder=False,
        )
        self.model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

        # Evaluate
        y_pred = self.model.predict(X_test)
        y_prob = self.model.predict_proba(X_test)[:, 1]

        self.metrics = {
            "accuracy": round(accuracy_score(y_test, y_pred), 4),
            "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
            "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
            "f1_score": round(f1_score(y_test, y_pred, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_test, y_prob), 4),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "classification_report": classification_report(y_test, y_pred, output_dict=True),
        }

        # SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)

        # Save model
        os.makedirs(os.path.dirname(self._model_path), exist_ok=True)
        with open(self._model_path, "wb") as f:
            pickle.dump({"model": self.model, "metrics": self.metrics}, f)

        print(f"Risk Scorer trained — ROC-AUC: {self.metrics['roc_auc']:.4f}, F1: {self.metrics['f1_score']:.4f}")
        return self.metrics

    def predict_risk_probabilities(self, X, temperature=2.5):
        """Apply temperature scaling to soften extreme XGBoost probabilities.

        Converts raw probabilities → logits, divides by temperature T,
        then maps back to probabilities. This compresses extremes toward
        mid-range while preserving exact rank ordering.
        """
        raw_probs = self.model.predict_proba(X)[:, 1]
        eps = 1e-7
        clamped = np.clip(raw_probs, eps, 1 - eps)
        logits = np.log(clamped / (1 - clamped))
        scaled_logits = logits / temperature
        return 1 / (1 + np.exp(-scaled_logits))

    def load(self):
        """Load a pre-trained model from disk."""
        if os.path.exists(self._model_path):
            with open(self._model_path, "rb") as f:
                data = pickle.load(f)
            self.model = data["model"]
            self.metrics = data["metrics"]
            self.explainer = shap.TreeExplainer(self.model)
            return True
        return False

    def score_transaction(self, txn: dict) -> dict:
        """Score a single transaction and return risk assessment."""
        if self.model is None:
            raise RuntimeError("Model not trained or loaded")

        features = self._extract_features(txn)
        X = pd.DataFrame([features])[MODEL_FEATURES]

        # Convert boolean columns to int
        for col in X.columns:
            if X[col].dtype == bool:
                X[col] = X[col].astype(int)

        fraud_prob = float(self.predict_risk_probabilities(X)[0])
        risk_score = int(fraud_prob * 100)

        # Risk category
        if risk_score < 30:
            category = "LOW"
            decision = "ALLOW"
        elif risk_score < 60:
            category = "MEDIUM"
            decision = "ALLOW"
        elif risk_score < 80:
            category = "HIGH"
            decision = "OTP_REVERIFY"
        else:
            category = "CRITICAL"
            decision = "BLOCK"

        # SHAP explanation
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # class 1 (fraud)
        else:
            sv = shap_values[0]

        feature_contributions = []
        for fname, sval in sorted(zip(MODEL_FEATURES, sv), key=lambda x: abs(x[1]), reverse=True):
            feature_contributions.append({
                "feature": fname,
                "contribution": round(float(sval), 4),
                "value": float(features.get(fname, 0)),
            })

        return {
            "fraud_probability": round(fraud_prob, 4),
            "risk_score": risk_score,
            "risk_category": category,
            "decision": decision,
            "feature_contributions": feature_contributions,
            "is_fraud_predicted": fraud_prob >= self.threshold,
        }

    def _extract_features(self, txn: dict) -> dict:
        """Extract model features from a raw transaction dict."""
        amount = float(txn.get("amount", 0))
        hour = int(txn.get("hour", 12))

        # Compute geo distance
        try:
            from data.generate_dataset import _haversine
            geo_dist = _haversine(
                float(txn.get("sender_home_lat", 19.076)),
                float(txn.get("sender_home_lon", 72.8777)),
                float(txn.get("txn_lat", 19.076)),
                float(txn.get("txn_lon", 72.8777)),
            )
        except Exception:
            geo_dist = 0.0

        return {
            "amount_log": float(np.log1p(amount)),
            "amount_zscore": float(txn.get("amount_zscore", (amount - 2000) / max(1000, 1))),
            "hour": hour,
            "is_night": 1 if hour <= 5 else 0,
            "is_weekend": int(txn.get("is_weekend", 0)),
            "device_changed": int(txn.get("device_changed", False)),
            "is_new_recipient": int(txn.get("is_new_recipient", False)),
            "geo_distance_km": float(geo_dist) if not np.isnan(geo_dist) else 0.0,
            "txn_count_daily": int(txn.get("txn_count_daily", 1)),
            "day_of_week": int(txn.get("day_of_week", 0)),
        }
