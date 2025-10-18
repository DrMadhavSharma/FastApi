from main import app
from typing import Annotated
from datetime import datetime, timedelta, timezone
from starlette.responses import RedirectResponse
from config import hash_password,verify_password
from fastapi import Depends, HTTPException
from sqlmodel import  Session, select 
from models import * 
from pydantic_models import *
from config import create_access_token , verify_token , get_current_user
from sqlalchemy import func
import json
from dateutil import parser
from typing import List, Dict
from datetime import date
from utils.email_utils import send_email


@app.post("/daily-reminder")
def daily_reminder_job(session: Session = Depends(get_session)):
    """Send daily reminders to patients with appointments today."""
    today = date.today()
    appointments = session.query(Appointment).filter(
        Appointment.appointment_date >= today,
        Appointment.status == "scheduled"
    ).all()

    for a in appointments:
        send_email(
            a.patient.user.email,
            "Appointment Reminder",
            f"Hello {a.patient.user.username}! You have an appointment with Dr. {a.doctor.user.username} today at {a.appointment_date}."
        )

    return {"message": f"{len(appointments)} reminders sent"}