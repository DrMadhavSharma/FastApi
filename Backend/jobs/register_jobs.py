from utils.qstash_utils import schedule_job
import os

BACKEND_URL = os.getenv("BACKEND_URL","https://fastapi-6mjn.onrender.com")

def register_jobs():
    # Daily reminders → every day at 8AM
    daily_endpoint = f"{BACKEND_URL}/jobs/daily-reminder"
    print("Scheduling daily reminders...")
    print(schedule_job(daily_endpoint, "* * * * *"))

    # Monthly reports → first day of month at 8AM
    monthly_endpoint = f"{BACKEND_URL}/jobs/monthly-report"
    print("Scheduling monthly reports...")
    print(schedule_job(monthly_endpoint, "* * * * *"))

if __name__ == "__main__":
    register_jobs()
