import os, requests

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
BASE_URL = "https://qstash.upstash.io/v1/publish"

def schedule_job(endpoint: str, cron: str):
    """Schedule recurring jobs with QStash (CRON format)."""
    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json"
    }
    body = {
        "url": endpoint,
        "method": "POST",
        "schedule": cron  # e.g. "* * * * *"
    }
    res = requests.post(BASE_URL, headers=headers, json=body)
    return res.json()
