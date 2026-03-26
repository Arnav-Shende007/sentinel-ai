"""
Layer 2 — Behavioral Profiling Engine
Isolation Forest anomaly detection + Z-score deviation scoring.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


class BehavioralProfiler:
    def __init__(self):
        self.user_profiles = {}
        self.isolation_forest = None

    def build_profiles(self, df: pd.DataFrame):
        """Build behavioral profiles for all users."""
        profile_features = [
            "amount", "hour", "geo_distance_km", "txn_count_daily",
        ]

        # Per-user statistics
        for user_id, group in df.groupby("sender_id"):
            self.user_profiles[user_id] = {
                "amount_mean": float(group["amount"].mean()),
                "amount_std": float(group["amount"].std()) if len(group) > 1 else float(group["amount"].mean() * 0.3),
                "amount_median": float(group["amount"].median()),
                "typical_hour_mean": float(group["hour"].mean()),
                "typical_hour_std": float(group["hour"].std()) if len(group) > 1 else 4.0,
                "avg_geo_distance": float(group["geo_distance_km"].mean()),
                "geo_std": float(group["geo_distance_km"].std()) if len(group) > 1 else 5.0,
                "avg_daily_txns": float(group["txn_count_daily"].mean()),
                "txn_count": len(group),
                "frequent_recipients": group["receiver_id"].value_counts().head(5).index.tolist(),
                "primary_device": group["device"].mode().iloc[0] if len(group) > 0 else "Android",
                "fraud_rate": float(group["is_fraud"].mean()),
            }

        # Train Isolation Forest on behavioral features
        agg = df.groupby("sender_id").agg({
            "amount": ["mean", "std", "max"],
            "hour": ["mean", "std"],
            "geo_distance_km": ["mean", "max"],
            "txn_count_daily": ["mean", "max"],
            "is_new_recipient": "mean",
            "device_changed": "mean",
        }).fillna(0)
        agg.columns = ["_".join(col) for col in agg.columns]

        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
        )
        self.isolation_forest.fit(agg)

        # Build global baseline for cold-start profiling
        self.global_profile = {
            "amount_mean": float(df["amount"].mean()),
            "amount_std": float(df["amount"].std()),
            "amount_median": float(df["amount"].median()),
            "typical_hour_mean": float(df["hour"].mean()),
            "typical_hour_std": float(df["hour"].std()) if float(df["hour"].std()) > 0 else 4.0,
            "avg_geo_distance": float(df["geo_distance_km"].mean()),
            "geo_std": float(df["geo_distance_km"].std()) if float(df["geo_distance_km"].std()) > 0 else 5.0,
            "avg_daily_txns": float(df["txn_count_daily"].mean()),
            "txn_count": 0,
            "frequent_recipients": [],
            "primary_device": df["device"].mode().iloc[0] if not df.empty else "Android",
            "fraud_rate": float(df["is_fraud"].mean()),
        }

        print(f"Behavioral profiles built for {len(self.user_profiles)} users")

    def analyze_transaction(self, txn: dict) -> dict:
        """Analyze a transaction against the sender's behavioral profile or global baseline."""
        sender_id = txn.get("sender_id", "")
        profile = self.user_profiles.get(sender_id)
        is_global = False

        if profile is None:
            profile = self.global_profile
            is_global = True

        deviations = []
        anomaly_score = 0.0

        # Amount deviation
        amount = float(txn.get("amount", 0))
        if profile["amount_std"] > 0:
            amount_z = abs(amount - profile["amount_mean"]) / profile["amount_std"]
        else:
            amount_z = 0
        if amount_z > 2:
            deviation_pct = round((amount / max(profile["amount_mean"], 1) - 1) * 100, 1)
            deviations.append({
                "factor": "amount_deviation",
                "detail": f"Amount ₹{amount:,.0f} is {amount_z:.1f}σ from usual (mean ₹{profile['amount_mean']:,.0f})",
                "z_score": round(amount_z, 2),
                "deviation_pct": deviation_pct,
            })
            anomaly_score += min(amount_z * 0.15, 0.4)

        # Time deviation
        hour = int(txn.get("hour", 12))
        if profile["typical_hour_std"] > 0:
            hour_z = abs(hour - profile["typical_hour_mean"]) / profile["typical_hour_std"]
        else:
            hour_z = 0
        if hour_z > 2:
            deviations.append({
                "factor": "unusual_time",
                "detail": f"Transaction at {hour}:00 is unusual (typical: {profile['typical_hour_mean']:.0f}:00 ± {profile['typical_hour_std']:.0f}h)",
                "z_score": round(hour_z, 2),
            })
            anomaly_score += min(hour_z * 0.1, 0.25)

        # Geo deviation
        geo_dist = float(txn.get("geo_distance_km", 0))
        if profile["geo_std"] > 0:
            geo_z = abs(geo_dist - profile["avg_geo_distance"]) / profile["geo_std"]
        else:
            geo_z = 0
        if geo_dist > 100 or geo_z > 3:
            deviations.append({
                "factor": "geo_anomaly",
                "detail": f"Transaction {geo_dist:.0f}km from home (usual: {profile['avg_geo_distance']:.0f}km)",
                "z_score": round(geo_z, 2),
            })
            anomaly_score += min(geo_z * 0.12, 0.3)

        # New recipient check
        receiver_id = txn.get("receiver_id", "")
        if not is_global and receiver_id and receiver_id not in profile.get("frequent_recipients", []):
            if txn.get("is_new_recipient"):
                deviations.append({
                    "factor": "new_recipient",
                    "detail": f"First-time recipient: {receiver_id}",
                })
                anomaly_score += 0.1

        # Device change
        if txn.get("device_changed"):
            deviations.append({
                "factor": "device_change",
                "detail": f"Suspicious or unrecognized device fingerprint: {txn.get('device', 'unknown')}",
            })
            anomaly_score += 0.15

        anomaly_score = min(anomaly_score, 1.0)

        if not deviations:
            deviations.append({
                "factor": "normal",
                "detail": "Transaction matches typical network behavioral patterns" if is_global else "Transaction is within normal behavioral parameters",
            })

        return {
            "anomaly_score": round(anomaly_score, 4),
            "profile_exists": not is_global,
            "deviations": deviations,
            "user_profile_summary": {
                "typical_amount": f"₹{profile['amount_mean']:,.0f} ± ₹{profile['amount_std']:,.0f}",
                "typical_hours": f"{profile['typical_hour_mean']:.0f}:00 - {profile['typical_hour_mean'] + profile['typical_hour_std']:.0f}:00",
                "total_transactions": profile["txn_count"] if not is_global else "Network Average",
                "historical_fraud_rate": f"{profile['fraud_rate']:.2%}",
            },
        }
