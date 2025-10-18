from fastapi import APIRouter, Depends, Body, HTTPException, Request
from sqlalchemy.orm import Session
from models import get_session
from models import Appointment, Patient
from utils.email_utils import send_csv_email
import csv, io
from main import app
import httpx
import os


@app.post("/export-csv")
def export_csv_job(
    patient_id: int = Body(...), 
    patient_email: str = Body(...),
    session: Session = Depends(get_session)
):
    """Generate CSV of a patient's treatments and email it."""
    patient = session.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments = session.query(Appointment).filter(
        Appointment.patient_id == patient_id
    ).all()

    if not appointments:
        return {"message": "No treatment records found"}

    # Build CSV
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=["Doctor", "Date", "Diagnosis/Notes", "Treatment"]
    )
    writer.writeheader()

    for a in appointments:
        writer.writerow({
            "Doctor": a.doctor.user.username,
            "Date": a.appointment_date,
            "Diagnosis/Notes": a.notes or "",
            "Treatment": a.notes or "",
        })

    csv_bytes = buffer.getvalue().encode()
    send_csv_email(patient_email, csv_bytes, f"treatments_{patient_id}.csv")

    return {"message": f"CSV sent to {patient_email}"}
@app.post("/trigger-export")
async def trigger_export(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://qstash.upstash.io/v1/publish",
            headers={"Authorization": f"Bearer {os.getenv('QSTASH_TOKEN')}"},
            json={
                "url": "https://fastapi-6mjn.onrender.com/export-csv",
                "method": "POST",
                "body": body
            }
        )
    return res.json()