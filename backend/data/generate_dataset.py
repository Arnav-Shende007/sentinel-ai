"""
Synthetic UPI Transaction Dataset Generator
Generates ~50K realistic transactions with injected fraud patterns.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

np.random.seed(42)

NUM_USERS = 500
NUM_TRANSACTIONS = 50000
FRAUD_RATE = 0.04  # 4% fraud rate

# Indian cities with lat/lon
CITIES = {
    "Mumbai": (19.076, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Bangalore": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Kolkata": (22.5726, 88.3639),
    "Hyderabad": (17.385, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
}

DEVICES = [
    "iPhone 14 Pro", "iPhone 15", "Galaxy S23 Ultra", "Galaxy A54",
    "OnePlus 11", "Pixel 8 Pro", "Redmi Note 13 Pro",
    "Chrome/Windows 11", "Safari/MacOS", "Edge/Windows 11",
]

UPI_SUFFIXES = ["@ybl", "@okaxis", "@oksbi", "@paytm", "@ibl", "@upi"]


def _random_upi_id():
    """Generate a realistic Indian phone-number-based UPI handle."""
    prefix = str(np.random.choice([6, 7, 8, 9]))
    digits = "".join([str(np.random.randint(0, 10)) for _ in range(9)])
    suffix = np.random.choice(UPI_SUFFIXES)
    return f"{prefix}{digits}{suffix}"


def generate_users(n: int) -> pd.DataFrame:
    city_names = list(CITIES.keys())
    users = []
    for i in range(n):
        city = city_names[i % len(city_names)]
        lat, lon = CITIES[city]
        users.append({
            "user_id": _random_upi_id(),
            "home_city": city,
            "home_lat": lat + np.random.normal(0, 0.02),
            "home_lon": lon + np.random.normal(0, 0.02),
            "typical_amount_mean": np.random.lognormal(7, 1),  # ~1000 INR median
            "typical_amount_std": np.random.lognormal(5, 1),
            "primary_device": np.random.choice(DEVICES),
            "usual_hour_start": np.random.randint(7, 12),
            "usual_hour_end": np.random.randint(17, 23),
        })
    return pd.DataFrame(users)


def generate_transactions(users: pd.DataFrame, n: int) -> pd.DataFrame:
    txns = []
    user_ids = users["user_id"].values
    start_date = datetime(2025, 1, 1)

    # Pre-build user lookup
    user_lookup = users.set_index("user_id").to_dict("index")

    # Generate regular recipients per user (frequent contacts)
    user_recipients = {}
    for uid in user_ids:
        num_freq = np.random.randint(3, 8)
        freq_recipients = np.random.choice(
            [u for u in user_ids if u != uid],
            size=min(num_freq, len(user_ids) - 1),
            replace=False,
        )
        user_recipients[uid] = freq_recipients

    for i in range(n):
        sender_id = np.random.choice(user_ids)
        sender = user_lookup[sender_id]

        # 70% chance to send to frequent recipient
        if np.random.random() < 0.7 and len(user_recipients[sender_id]) > 0:
            receiver_id = np.random.choice(user_recipients[sender_id])
            is_new_recipient = False
        else:
            receiver_id = np.random.choice([u for u in user_ids if u != sender_id])
            is_new_recipient = receiver_id not in user_recipients[sender_id]

        receiver = user_lookup[receiver_id]

        # Amount — normally distributed around user's typical
        amount = max(10, np.random.normal(sender["typical_amount_mean"], sender["typical_amount_std"]))

        # Timestamp
        days_offset = int(np.random.randint(0, 90))
        hour = int(np.random.choice(range(24), p=_hour_weights(sender["usual_hour_start"], sender["usual_hour_end"])))
        minute = int(np.random.randint(0, 60))
        timestamp = start_date + timedelta(days=days_offset, hours=hour, minutes=minute)

        # Device
        device_changed = np.random.random() < 0.05
        device = np.random.choice(DEVICES) if device_changed else sender["primary_device"]

        # Location — normally near home city
        txn_lat = sender["home_lat"] + np.random.normal(0, 0.05)
        txn_lon = sender["home_lon"] + np.random.normal(0, 0.05)

        txns.append({
            "transaction_id": f"{np.random.randint(100000, 999999)}{np.random.randint(100000, 999999)}",
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "amount": round(float(amount), 2),
            "timestamp": timestamp,
            "hour": int(hour),
            "day_of_week": int(timestamp.weekday()),
            "device": str(device),
            "device_changed": bool(device_changed),
            "txn_lat": round(float(txn_lat), 4),
            "txn_lon": round(float(txn_lon), 4),
            "sender_home_lat": round(float(sender["home_lat"]), 4),
            "sender_home_lon": round(float(sender["home_lon"]), 4),
            "is_new_recipient": bool(is_new_recipient),
            "is_fraud": 0,
        })

    df = pd.DataFrame(txns)

    # --- Inject fraud patterns ---
    num_fraud = int(n * FRAUD_RATE)
    fraud_indices = np.random.choice(df.index, size=num_fraud, replace=False)

    for idx in fraud_indices:
        fraud_type = np.random.choice(
            ["high_amount", "night_burst", "device_change", "geo_anomaly", "mule_chain"],
            p=[0.25, 0.20, 0.20, 0.20, 0.15],
        )

        df.at[idx, "is_fraud"] = 1

        if fraud_type == "high_amount":
            df.at[idx, "amount"] = df.at[idx, "amount"] * np.random.uniform(5, 20)
        elif fraud_type == "night_burst":
            df.at[idx, "hour"] = int(np.random.choice([0, 1, 2, 3, 4]))
            df.at[idx, "amount"] = df.at[idx, "amount"] * np.random.uniform(2, 8)
        elif fraud_type == "device_change":
            df.at[idx, "device_changed"] = True
            df.at[idx, "device"] = np.random.choice(DEVICES)
            df.at[idx, "is_new_recipient"] = True
        elif fraud_type == "geo_anomaly":
            # Place transaction far from home
            other_city = np.random.choice(list(CITIES.keys()))
            lat, lon = CITIES[other_city]
            df.at[idx, "txn_lat"] = lat + np.random.normal(0, 0.01)
            df.at[idx, "txn_lon"] = lon + np.random.normal(0, 0.01)
        elif fraud_type == "mule_chain":
            df.at[idx, "is_new_recipient"] = True
            df.at[idx, "amount"] = round(np.random.uniform(49000, 49999), 2)  # Just under 50K limit

    df["amount"] = df["amount"].round(2)
    return df


def _hour_weights(start: int, end: int) -> list:
    """Generate hour probabilities — higher during usual hours."""
    weights = []
    for h in range(24):
        if start <= h <= end:
            weights.append(3.0)
        elif 0 <= h <= 5:
            weights.append(0.3)
        else:
            weights.append(1.0)
    total = sum(weights)
    return [w / total for w in weights]


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer features for ML model training."""
    features = df.copy()

    # Amount statistics per sender
    sender_stats = df.groupby("sender_id")["amount"].agg(["mean", "std"]).fillna(1)
    sender_stats.columns = ["sender_amount_mean", "sender_amount_std"]
    features = features.merge(sender_stats, left_on="sender_id", right_index=True, how="left")

    # Amount z-score
    features["amount_zscore"] = (
        (features["amount"] - features["sender_amount_mean"]) / features["sender_amount_std"].clip(lower=1)
    ).clip(-10, 10)

    # Geo distance (Haversine approximation in km)
    features["geo_distance_km"] = _haversine(
        features["sender_home_lat"], features["sender_home_lon"],
        features["txn_lat"], features["txn_lon"],
    )

    # Transaction frequency in last 24 hours (simulated via same-day count)
    features["txn_count_daily"] = features.groupby(
        [features["sender_id"], features["timestamp"].dt.date]
    )["sender_id"].transform("count")

    # Is night transaction
    features["is_night"] = ((features["hour"] >= 0) & (features["hour"] <= 5)).astype(int)

    # Is weekend
    features["is_weekend"] = (features["day_of_week"] >= 5).astype(int)

    # Amount log
    features["amount_log"] = np.log1p(features["amount"])

    return features


def _haversine(lat1, lon1, lat2, lon2):
    """Vectorized haversine distance in km."""
    R = 6371
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2
    return R * 2 * np.arcsin(np.sqrt(a))


def get_dataset(force_regenerate: bool = False) -> pd.DataFrame:
    """Return the featured dataset, generating if needed."""
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data_cache")
    os.makedirs(data_dir, exist_ok=True)
    cache_path = os.path.join(data_dir, "transactions.csv")

    if not force_regenerate and os.path.exists(cache_path):
        return pd.read_csv(cache_path, parse_dates=["timestamp"])

    print("Generating synthetic dataset...")
    users = generate_users(NUM_USERS)
    txns = generate_transactions(users, NUM_TRANSACTIONS)
    featured = compute_features(txns)
    featured.to_csv(cache_path, index=False)
    print(f"Dataset saved: {len(featured)} transactions, {featured['is_fraud'].sum()} fraud cases")
    return featured


if __name__ == "__main__":
    df = get_dataset(force_regenerate=True)
    print(df.head())
    print(f"\nFraud rate: {df['is_fraud'].mean():.2%}")
    print(f"Shape: {df.shape}")