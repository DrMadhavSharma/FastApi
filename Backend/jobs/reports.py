from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_session
from models import Doctor, Appointment
from utils.email_utils import send_email
from datetime import date
import calendar
from main import app


@app.post("/monthly-report")
def monthly_report_job(session: Session = Depends(get_session)):
    """Send monthly report to doctors with appointments done in current month."""
    today = date.today()
    start_date = today.replace(day=1)
    _, last_day = calendar.monthrange(today.year, today.month)
    end_date = today.replace(day=last_day)

    doctors = session.query(Doctor).all()
    sent_count = 0

    for doc in doctors:
        appointments = session.query(Appointment).filter(
            Appointment.doctor_id == doc.id,
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date
        ).all()

        if not appointments:
            continue

        rows = "".join(
            f"<tr><td>{a.patient.user.username}</td><td>{a.appointment_date}</td><td>{a.notes or ''}</td></tr>"
            for a in appointments
        )
        html_report = f"""
        <h3>Monthly Activity Report</h3>
        <table border='1' cellpadding='5'>
            <tr><th>Patient</th><th>Date</th><th>Notes</th></tr>
            {rows}
        </table>
        """
        send_email(doc.user.email, "Monthly Activity Report", html_report, html=True)
        sent_count += 1

    return {"message": f"Monthly reports sent to {sent_count} doctors"}
