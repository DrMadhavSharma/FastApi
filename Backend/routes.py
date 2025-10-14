from .main import app
from typing import Annotated
from datetime import datetime, timedelta, timezone
from starlette.responses import RedirectResponse
from .config import hash_password,verify_password
from fastapi import Depends, HTTPException
from sqlmodel import  Session, select 
from .models import * 
from .pydantic_models import *
from .config import create_access_token , verify_token , get_current_user
from sqlalchemy import func
import json
from dateutil import parser

def require_admin(user):
    if "admin" not in user.get("roles", []):
        raise HTTPException(status_code=403, detail="Admin only")
def authenticate_user(db: Session,email: str, password: str):
        stmt = select(User).where(User.email == email)
        db_user = db.execute(stmt).scalar_one_or_none()

        if not db_user:
            return None
        if not verify_password(password, db_user.password):
            return None
        return db_user

@app.get("/")
def index_page():
    return {"message": "Welcome to the Hospital Management Application!"}
# @app.post("/login")
# def login_page(user:Login,db:Session=Depends(get_session)):
#     db_user=authenticate_user(db , user.email, user.password)
#     if db_user:
#         if db_user.role == RoleEnum.doctor:
#             # doctor =db.execute(select(Doctor).where(Doctor.user_id==db_user.id)).scalar_one_or_none()
#             return RedirectResponse(url=f"/dashboard/Doctor/{db_user.id}", status_code=302) 
#         elif db_user.role == RoleEnum.patient:
#             # patient = db.execute(select(Patient).where(Patient.user_id==db_user.id)).scalar_one_or_none()
#             return RedirectResponse(url=f"/dashboard/Patient/{db_user.id}", status_code=302) 
#     else:
#         raise HTTPException(status_code=404, detail="Invalid email or password")
#     return {"message": "Login Page"}
@app.post("/login")
def login_page(user: Login, db: Session = Depends(get_session)):
    db_user = authenticate_user(db, user.email, user.password)

    if not db_user:
        raise HTTPException(status_code=404, detail="Invalid email or password")

    # Generate JWT token with role info
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
    data={"sub": db_user.username, "email": db_user.email, "roles": [db_user.role.value]}
    ,expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role.value
    }

# ----------------------
# Admin Endpoints
# ----------------------
@app.get("/admin/summary")
def admin_summary(user=Depends(get_current_user), db: Session = Depends(get_session)):
    require_admin(user)
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    return {
        "doctors": total_doctors,
        "patients": total_patients,
        "appointments": total_appointments
    }

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
            "notes": a.notes
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
        "patients": [{"id": p.id, "user_id": p.user_id, "age": p.age} for p in patients]
    }

from .pydantic_models import DoctorUpdate, PatientUpdate

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
        is_active=True
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
        is_active=True
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
@app.post("/register/doctor")
def register_doctor(doctor: DoctorCR, db: Session = Depends(get_session)):
    # 1. Check if user with same email exists
    existing_user = db.execute(
        select(User).where(User.email == doctor.email)
    ).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create User record
    db_user = User(
        username=doctor.username,
        email=doctor.email,
        password=hash_password(doctor.password),
        role=RoleEnum.doctor,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 3. Create Doctor profile linked to User
    db_doctor = Doctor(
        user_id=db_user.id,
        specialization=doctor.specialization,
        bio=doctor.bio,
        availability=doctor.availability
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)

    return {
        "msg": "Doctor registered successfully",
        # "user_id": db_user.id,
        "doctor_id": db_doctor.id
    }
@app.post("/register/patient")
def p_register_page(patient:PatientCR,db :Session =Depends(get_session)):
    # 1. Check if user with same email exists
    existing_user = db.execute(
        select(User).where(User.email == patient.email)
    ).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create User record
    db_user = User(
        username=patient.username,
        email=patient.email,
        password=hash_password(patient.password),
        role=RoleEnum.patient,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 3. Create Patient profile linked to User
    db_Patient = Patient(
        user_id=db_user.id,
        age=patient.age,
        medical_history=patient.medical_history,
        address=patient.address
    )
    db.add(db_Patient)
    db.commit()
    db.refresh(db_Patient)

    return {
        "msg": "Doctor registered successfully",
        # "user_id": db_user.id,
        "Patient_id": db_Patient.id
    }
# @app.get("/dashboard/Doctor/{user_id}",response_model=DoctorCombined)
# def doctor_dashboard(user_id: int, db: Session = Depends(get_session)):
#     user= db.get(User, user_id)
#     doctor=db.execute(select(Doctor).where(Doctor.user_id==user_id)).scalar_one_or_none()
#     return DoctorCombined(
#         user=user,
#         doctor=doctor
#     )

# @app.get("/dashboard/Patient/{user_id}",response_model=PatientCombined)
# def patient_dashboard(user_id: int, db: Session = Depends(get_session)):
#     user = db.get(User, user_id)
#     patient=db.execute(select(Patient).where(Patient.user_id==user_id)).scalar_one_or_none()
#     return PatientCombined(
#         user=user,
#         patient=patient
#     )
@app.get("/dashboard/doctor")
def doctor_dashboard(user=Depends(get_current_user)):
    if "doctor" not in user["roles"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"msg": f"Hello Doctor {user['username']}"}

@app.post("/dashboard/patient")
def patient_dashboard(user=Depends(get_current_user)):
    if "patient" not in user["roles"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"msg": f"Hello Patient {user['username']}"}

@app.get("/appointments")
def get_appointments(current_user: dict = Depends(get_current_user), db: Session = Depends(get_session)):
    db_user = db.query(User).filter(User.email == current_user["email"]).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.role == RoleEnum.patient:
        patient = db_user.patient_profile
        appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id).all()
    elif db_user.role == RoleEnum.doctor:
        doctor = db_user.doctor_profile
        appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
    else:
        appointments = db.query(Appointment).all()  # for admin

    # Return a **list of dictionaries** so frontend can map
    result = []
    for a in appointments:
        result.append({
            "id": a.id,
            "doctor_id": a.doctor_id,
            "doctor_name": a.doctor.user.username,  # add this
            "patient_id": a.patient_id,
            "appointment_date": a.appointment_date.isoformat(),
            "status": a.status.value,
            "notes": a.notes
        })
    return result


#BOOK APPOINTMENT

def parse_to_utc(dt_str: str):
    """
    Parse an ISO datetime string to a timezone-aware UTC datetime,
    normalizing microseconds to 0 for consistent DB comparisons.
    """
    dt = parser.isoparse(dt_str)
    # convert naive datetimes to UTC (treat naive as UTC),
    # and convert any timezone-aware to UTC.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.replace(microsecond=0)

@app.post("/appointments/book")
def book_appointment(
    payload: AppointmentBook,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Book an appointment at the requested time.
    Behavior:
      - Does NOT require the requested slot to be present in doctor's availability.
      - Will reject only if there is already an appointment for the doctor at the same datetime.
    """
    # Extract payload
    doctor_id = payload.doctor_id
    appointment_date_str = payload.appointment_date
    notes = payload.notes or ""

    # Validate user
    db_user = db.query(User).filter(User.email == current_user["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    patient = db_user.patient_profile
    if not patient:
        raise HTTPException(status_code=400, detail="No patient profile found")

    # Validate doctor
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Parse requested datetime to UTC
    try:
        requested_slot = parse_to_utc(appointment_date_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid appointment date format: {e}")

    # --- IMPORTANT: DO NOT block if slot not in doctor.availability ---
    # Instead we only check conflicts (double booking)
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appointment_date == requested_slot
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Doctor already has an appointment at this time")
    if requested_slot < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Cannot book appointment in the past")
    # Create appointment
    new_appt = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        appointment_date=requested_slot,
        status=AppointmentStatusEnum.scheduled,
        notes=notes
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)

    return {
        "message": "Appointment booked successfully",
        "appointment": {
            "id": new_appt.id,
            "doctor_id": new_appt.doctor_id,
            "patient_id": new_appt.patient_id,
            "appointment_date": new_appt.appointment_date.isoformat(),
            "status": new_appt.status.value,
            "notes": new_appt.notes,
        },
    }
#patient cancels appointements
@app.patch("/appointments/cancel/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Cancel an appointment if it belongs to the current patient.
    """
    # Validate user
    db_user = db.query(User).filter(User.email == current_user["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    patient = db_user.patient_profile
    if not patient:
        raise HTTPException(status_code=400, detail="No patient profile found")

    # Fetch appointment
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.patient_id == patient.id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.status == AppointmentStatusEnum.cancelled:
        raise HTTPException(status_code=400, detail="Appointment already cancelled")

    if appointment.appointment_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot cancel past appointments")

    # Cancel appointment
    appointment.status = AppointmentStatusEnum.cancelled
    db.commit()
    db.refresh(appointment)

    return {"message": "Appointment cancelled successfully", "appointment_id": appointment.id}
#patient search doctors
@app.get("/doctors/search")
def search_doctors(q: str = "", db: Session = Depends(get_session)):
    """
    Search doctors by specialization or username
    """
    doctors = db.query(Doctor).join(User).filter(
        (Doctor.specialization.ilike(f"%{q}%")) |
        (User.username.ilike(f"%{q}%"))
    ).all()

    result = []
    for d in doctors:
        result.append({
            "id": d.id,
            "username": d.user.username,
            "email": d.user.email,
            "specialization": d.specialization,
            "bio": d.bio,
            "availability": d.availability
        })

    return result

#list of doctors 
@app.get("/doctors")
def list_doctors(db: Session = Depends(get_session)):
    """
    List all doctors with their profiles (specialization, bio, availability)
    """
    doctors = db.query(Doctor).all()
    result = []

    for d in doctors:
        # skip doctor if no associated user
        if not d.user:
            continue
        result.append({
            "id": d.id,
            "username": d.user.username,
            "email": d.user.email,
            "specialization": d.specialization,
            "bio": d.bio,
            "availability": json.loads(d.availability) if d.availability else []
        })

    return result
@app.put("/patient/update")
def patient_update(payload: PatientUpdate, user=Depends(get_current_user), db: Session = Depends(get_session)):
    """
    Update a patient .
    """
    # Validate user
    db_user = db.query(User).filter(User.email == user["email"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.role != RoleEnum.patient:
        raise HTTPException(status_code=403, detail="Only patients can update ")
    patient = db_user.patient_profile
    if not patient:
        raise HTTPException(status_code=400, detail="No patient profile found")
    if payload.username is not None: db_user.username = payload.username
    if payload.email is not None: db_user.email = payload.email
    if payload.password is not None: db_user.password = hash_password(payload.password)
    if payload.age is not None: patient.age = payload.age
    if payload.address is not None: patient.address = payload.address
    if payload.medical_history is not None: patient.medical_history = payload.medical_history
    db.add_all([db_user, patient]); db.commit()
    return {"status": "updated"}
