from .main import app
from typing import Annotated
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func

from .models import *
from .pydantic_models import *
from .config import create_access_token, verify_token, get_current_user, hash_password
from pydantic import BaseModel, EmailStr


def authenticate_user(db: Session, email: str, password: str):
    stmt = select(User).where(User.email == email)
    db_user = db.execute(stmt).scalar_one_or_none()
    if not db_user:
        return None
    from .config import verify_password as _verify
    if not _verify(password, db_user.password):
        return None
    return db_user


@app.get("/")
def index_page():
    return {"message": "Welcome to the Hospital Management Application!"}


@app.post("/login")
def login_page(user: Login, db: Session = Depends(get_session)):
    db_user = authenticate_user(db, user.email, user.password)
    if not db_user:
        raise HTTPException(status_code=404, detail="Invalid email or password")
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": db_user.email, "roles": [db_user.role.value]},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer", "role": db_user.role.value}


# Admin endpoints
def require_admin(user):
    if "admin" not in user.get("roles", []):
        raise HTTPException(status_code=403, detail="Admin only")


@app.get("/admin/summary")
def admin_summary(user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    return {"doctors": total_doctors, "patients": total_patients, "appointments": total_appointments}


@app.get("/admin/appointments")
def admin_list_appointments(user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    appts = db.query(Appointment).order_by(Appointment.appointment_date.desc()).all()
    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "doctor_id": a.doctor_id,
            "patient_id": a.patient_id,
            "appointment_date": a.appointment_date,
            "status": a.status.value,
            "notes": a.notes,
        })
    return result


@app.get("/admin/search")
def admin_search(q: str, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    users = db.execute(select(User).where(User.username.ilike(f"%{q}%"))).scalars().all()
    doctors = db.execute(select(Doctor).join(User).where(User.username.ilike(f"%{q}%"))).scalars().all()
    patients = db.execute(select(Patient).join(User).where(User.username.ilike(f"%{q}%"))).scalars().all()
    return {
        "users": [{"id": u.id, "username": u.username, "email": u.email, "role": u.role.value, "is_active": u.is_active} for u in users],
        "doctors": [{"id": d.id, "user_id": d.user_id, "specialization": d.specialization} for d in doctors],
        "patients": [{"id": p.id, "user_id": p.user_id, "age": p.age} for p in patients],
    }


@app.post("/admin/doctors")
def admin_add_doctor(doctor: DoctorCR, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    existing_user = db.execute(select(User).where(User.email == doctor.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(
        username=doctor.username,
        email=doctor.email,
        password=hash_password(doctor.password),
        role=RoleEnum.doctor,
        is_active=True,
    )
    db.add(db_user); db.commit(); db.refresh(db_user)
    db_doctor = Doctor(user_id=db_user.id, specialization=doctor.specialization, bio=doctor.bio, availability=doctor.availability)
    db.add(db_doctor); db.commit(); db.refresh(db_doctor)
    return {"id": db_doctor.id}


@app.put("/admin/doctors/{doctor_id}")
def admin_update_doctor(doctor_id: int, payload: DoctorUpdate, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    doc = db.get(Doctor, doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    usr = db.get(User, doc.user_id)
    if payload.username is not None: usr.username = payload.username
    if payload.email is not None: usr.email = payload.email
    if payload.password is not None: usr.password = hash_password(payload.password)
    if payload.specialization is not None: doc.specialization = payload.specialization
    if payload.bio is not None: doc.bio = payload.bio
    if payload.availability is not None: doc.availability = payload.availability
    db.add_all([usr, doc]); db.commit()
    return {"status": "updated"}


@app.delete("/admin/doctors/{doctor_id}")
def admin_remove_doctor(doctor_id: int, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    doc = db.get(Doctor, doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    usr = db.get(User, doc.user_id)
    usr.is_active = False
    db.add(usr); db.commit()
    return {"status": "blacklisted"}


@app.post("/admin/patients")
def admin_add_patient(patient: PatientCR, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    existing_user = db.execute(select(User).where(User.email == patient.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = User(
        username=patient.username,
        email=patient.email,
        password=hash_password(patient.password),
        role=RoleEnum.patient,
        is_active=True,
    )
    db.add(db_user); db.commit(); db.refresh(db_user)
    db_patient = Patient(user_id=db_user.id, age=patient.age, address=patient.address, medical_history=patient.medical_history)
    db.add(db_patient); db.commit(); db.refresh(db_patient)
    return {"id": db_patient.id}


@app.put("/admin/patients/{patient_id}")
def admin_update_patient(patient_id: int, payload: PatientUpdate, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    pat = db.get(Patient, patient_id)
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    usr = db.get(User, pat.user_id)
    if payload.username is not None: usr.username = payload.username
    if payload.email is not None: usr.email = payload.email
    if payload.password is not None: usr.password = hash_password(payload.password)
    if payload.age is not None: pat.age = payload.age
    if payload.address is not None: pat.address = payload.address
    if payload.medical_history is not None: pat.medical_history = payload.medical_history
    db.add_all([usr, pat]); db.commit()
    return {"status": "updated"}


@app.delete("/admin/patients/{patient_id}")
def admin_remove_patient(patient_id: int, user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    pat = db.get(Patient, patient_id)
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    usr = db.get(User, pat.user_id)
    usr.is_active = False
    db.add(usr); db.commit()
    return {"status": "blacklisted"}


# Doctor endpoints
class StatusUpdate(BaseModel):
    status: str


class AvailabilityPayload(BaseModel):
    days: list[dict]


class HistoryEntry(BaseModel):
    diagnosis: str | None = None
    treatment: str | None = None
    prescriptions: str | None = None


def get_doctor_user(db: Session, user_email: str):
    usr = db.execute(select(User).where(User.email == user_email)).scalar_one_or_none()
    if not usr or usr.role != RoleEnum.doctor:
        raise HTTPException(status_code=403, detail="Doctor only")
    doc = db.execute(select(Doctor).where(Doctor.user_id == usr.id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return usr, doc


@app.get("/doctor/appointments")
def doctor_appointments(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"])  # token sub holds email
    appts = db.execute(select(Appointment).where(Appointment.doctor_id == doc.id)).scalars().all()
    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "doctor_id": a.doctor_id,
            "patient_id": a.patient_id,
            "appointment_date": a.appointment_date,
            "status": a.status.value,
            "notes": a.notes,
        })
    return result


@app.put("/doctor/appointments/{appointment_id}/status")
def doctor_update_status(appointment_id: int, payload: StatusUpdate, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"]) 
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.doctor_id != doc.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    try:
        appt.status = AppointmentStatusEnum(payload.status)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid status")
    db.add(appt); db.commit()
    return {"status": appt.status.value}


@app.get("/doctor/patients")
def doctor_patients(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"]) 
    pats = db.execute(
        select(Patient).join(Appointment, Appointment.patient_id == Patient.id).where(Appointment.doctor_id == doc.id).distinct()
    ).scalars().all()
    out = []
    for p in pats:
        u = db.get(User, p.user_id)
        out.append({"id": p.id, "user_id": p.user_id, "username": u.username, "age": p.age, "address": p.address, "medical_history": p.medical_history})
    return out


@app.put("/doctor/availability")
def doctor_set_availability(payload: AvailabilityPayload, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"]) 
    import json
    doc.availability = json.dumps(payload.days)
    db.add(doc); db.commit()
    return {"status": "saved"}


@app.get("/doctor/patient/{patient_id}/history")
def get_patient_history(patient_id: int, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"]) 
    import json
    appts = db.execute(select(Appointment).where(Appointment.patient_id == patient_id, Appointment.doctor_id == doc.id)).scalars().all()
    history = []
    for a in appts:
        entry = {"date": a.appointment_date}
        if a.notes:
            try:
                n = json.loads(a.notes)
                entry.update(n)
            except Exception:
                entry["notes"] = a.notes
        history.append(entry)
    return history


@app.post("/doctor/patient/{patient_id}/history")
def add_patient_history(patient_id: int, payload: HistoryEntry, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, doc = get_doctor_user(db, user["username"]) 
    appt = db.execute(select(Appointment).where(Appointment.patient_id == patient_id, Appointment.doctor_id == doc.id).order_by(Appointment.appointment_date.desc())).scalars().first()
    if not appt:
        raise HTTPException(status_code=404, detail="No appointment to attach history")
    import json
    appt.notes = json.dumps(payload.model_dump())
    db.add(appt); db.commit()
    return {"status": "saved"}


# Patient endpoints
class ProfileUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    age: int | None = None
    address: str | None = None


class BookAppointment(BaseModel):
    doctor_id: int
    appointment_date: datetime


def get_patient_user(db: Session, email: str):
    usr = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not usr or usr.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Patient only")
    pat = db.execute(select(Patient).where(Patient.user_id == usr.id)).scalar_one_or_none()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return usr, pat


@app.get("/patient/specializations")
def patient_specializations(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    specs = db.execute(select(Doctor.specialization).distinct()).scalars().all()
    return specs


@app.get("/patient/doctors")
def patient_doctors(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    import json
    rows = db.execute(select(Doctor, User).join(User, User.id == Doctor.user_id)).all()
    out = []
    for d, u in rows:
        avail = []
        if d.availability:
            try:
                avail = json.loads(d.availability)
            except Exception:
                avail = []
        out.append({"id": d.id, "username": u.username, "specialization": d.specialization, "bio": d.bio, "availability": avail})
    return out


@app.get("/patient/appointments")
def patient_appointments(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    import json
    appts = db.execute(select(Appointment).where(Appointment.patient_id == pat.id)).scalars().all()
    out = []
    for a in appts:
        item = {"id": a.id, "doctor_id": a.doctor_id, "appointment_date": a.appointment_date, "status": a.status.value}
        if a.notes:
            try:
                item.update(json.loads(a.notes))
            except Exception:
                item["notes"] = a.notes
        out.append(item)
    return out


@app.get("/patient/profile")
def patient_profile(user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    return {"username": usr.username, "email": usr.email, "age": pat.age, "address": pat.address}


@app.put("/patient/profile")
def patient_profile_update(payload: ProfileUpdate, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    if payload.username is not None: usr.username = payload.username
    if payload.email is not None: usr.email = payload.email
    if payload.age is not None: pat.age = payload.age
    if payload.address is not None: pat.address = payload.address
    db.add_all([usr, pat]); db.commit()
    return {"status": "updated"}


@app.post("/patient/appointments")
def patient_book(payload: BookAppointment, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    doc = db.get(Doctor, payload.doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    appt = Appointment(doctor_id=doc.id, patient_id=pat.id, appointment_date=payload.appointment_date, status=AppointmentStatusEnum.scheduled)
    db.add(appt); db.commit(); db.refresh(appt)
    return {"id": appt.id}


@app.delete("/patient/appointments/{appointment_id}")
def patient_cancel(appointment_id: int, user=Depends(get_current_user), db: Session = Depends(get_session)):
    usr, pat = get_patient_user(db, user["username"]) 
    appt = db.get(Appointment, appointment_id)
    if not appt or appt.patient_id != pat.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = AppointmentStatusEnum.canceled
    db.add(appt); db.commit()
    return {"status": "canceled"}


