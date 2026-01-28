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
import pytz
def enforce_user_limit(db: Session):
    MAX_ACTIVE_USERS = 500
    total_active = db.query(User).filter(User.is_active==True).count()
    if total_active >= MAX_ACTIVE_USERS:
        # mark oldest active users as inactive
        to_deactivate = db.query(User)\
                          .filter(User.is_active==True)\
                          .order_by(User.id.asc())\
                          .limit(total_active - MAX_ACTIVE_USERS + 1)\
                          .all()
        for u in to_deactivate:
            u.is_active = False
        db.commit()

def utc_to_ist(dt):
    if dt is None:
        return None
    ist = pytz.timezone('Asia/Kolkata')
    return dt.astimezone(ist)
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
    enforce_user_limit(db)
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
            "appointment_date": utc_to_ist(a.appointment_date),
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

from pydantic_models import DoctorUpdate, PatientUpdate

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
    enforce_user_limit(db)
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
    enforce_user_limit(db)
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
        print(appointments)
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
            "appointment_date": utc_to_ist(a.appointment_date),
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
#doctor's patients
@app.get("/doctors/patients")
def get_doctor_patients(
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Return all unique patients assigned to the logged-in doctor.
    """
    # 1️⃣ Ensure current user is a doctor
    if "doctor" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access restricted to doctors only")

    # 2️⃣ Find doctor by user email (join with User)
    doctor = (
        db.query(Doctor)
        .join(User)
        .filter(User.email == current_user["email"])
        .first()
    )

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # 3️⃣ Get all unique patient_ids linked to this doctor
    patient_ids = (
        db.query(Appointment.patient_id)
        .filter(Appointment.doctor_id == doctor.id)
        .distinct()
        .all()
    )
    patient_ids = [pid[0] for pid in patient_ids]

    if not patient_ids:
        return []

    # 4️⃣ Fetch patient + user details
    patients = (
        db.query(Patient, User)
        .join(User, Patient.user_id == User.id)
        .filter(Patient.id.in_(patient_ids))
        .all()
    )

    # 5️⃣ Build response
    result = []
    for patient, user in patients:
        result.append({
            "id": patient.id,
            "username": user.username,
            "email": user.email,
            "age": patient.age,
            "address": patient.address,
            "medical_history": patient.medical_history,
        })

    return result
@app.put("/doctor/appointments/{id}/status")
def update_appointment_status(
    id: int,
    payload: AppointmentStatusUpdate,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Allow doctors to update the status of their appointments.
    """
    # 1️⃣ Ensure current user is a doctor
    if "doctor" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access restricted to doctors only")

    # 2️⃣ Find doctor by user email (join with User)
    doctor = (
        db.query(Doctor)
        .join(User)
        .filter(User.email == current_user["email"])
        .first()
    )

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # 3️⃣ Fetch the appointment ensuring it belongs to this doctor
    appointment = db.query(Appointment).filter(
        Appointment.id == id,
        Appointment.doctor_id == doctor.id
    ).first()

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # 4️⃣ Update status
    appointment.status = payload.status
    db.commit()
    db.refresh(appointment)

    return {
        "message": "Appointment status updated successfully",
        "appointment": {
            "id": appointment.id,
            "doctor_id": appointment.doctor_id,
            "patient_id": appointment.patient_id,
            "appointment_date": utc_to_ist(appointment.appointment_date),
            "status": appointment.status.value,
            "notes": appointment.notes,
        },
    }
# -------------------------
# Get Doctor Availability
# -------------------------
@app.get("/doctor/availability")
def get_availability(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    if "doctor" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access restricted to doctors")
    
    doctor = db.query(Doctor).join(User).filter(User.email == current_user["email"]).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    availability = json.loads(doctor.availability) if doctor.availability else []
    return {"availability": availability}


# -------------------------
# Update Doctor Availability
# -------------------------
@app.put("/doctor/availability")
def update_availability(
    payload: Dict[str, List[Dict[str, str]]],
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    payload example:
    {
      "days": [
        {"date": "2025-10-18", "slots": "09:00-12:00,14:00-18:00"},
        {"date": "2025-10-19", "slots": "10:00-13:00"}
      ]
    }
    """
    if "doctor" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access restricted to doctors")
    
    doctor = db.query(Doctor).join(User).filter(User.email == current_user["email"]).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    days = payload.get("days")
    if not days or not isinstance(days, list):
        raise HTTPException(status_code=400, detail="Invalid payload format")
    
    # Save as JSON string
    doctor.availability = json.dumps(days)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    
    return {"message": "Availability updated successfully", "availability": days}


from main import app
from typing import Annotated
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func

from models import *
from pydantic_models import *
from config import create_access_token, verify_token, get_current_user, hash_password
from pydantic import BaseModel, EmailStr


def authenticate_user(db: Session, email: str, password: str):
    stmt = select(User).where(User.email == email)
    db_user = db.execute(stmt).scalar_one_or_none()
    if not db_user:
        return None
    from config import verify_password as _verify
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
##################################################################################3


import os
import io
import csv
import uuid
import httpx
from fastapi import FastAPI, Body, Request, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from models import get_session, Patient, Appointment
from utils.email_utils import send_email

# app = FastAPI()

# ----------------- In-memory task tracking -----------------
# Each task_id maps to a dict: {"status": "pending|completed|failed", "filename": str}
task_results = {}  

CSV_STORAGE_DIR = "csv_exports"
os.makedirs(CSV_STORAGE_DIR, exist_ok=True)
class ExportCSVRequest(BaseModel):
    patient_id: int
    patient_email: EmailStr
    task_id: str # task_id from QStash trigger
# # ----------------- Worker route: generates CSV and sends email -----------------
# @app.post("/export-csv")
# def export_csv_job(
#     payload: ExportCSVRequest,
#     session: Session = Depends(get_session)
# ):
#     """Generate CSV of a patient's treatments, email it, and store for download."""
#     task_results[payload.task_id] = {"status": "pending", "filename": None}
#     try:
#         patient = session.query(Patient).filter(Patient.id == payload.patient_id).first()
#         if not patient:
#             task_results[payload.task_id]["status"] = "failed"
#             raise HTTPException(status_code=404, detail="Patient not found")

#         appointments = session.query(Appointment).filter(
#             Appointment.patient_id == payload.patient_id
#         ).all()

#         if not appointments:
#             task_results[payload.task_id]["status"] = "completed"
#             return {"message": "No treatment records found"}

#         # Build CSV
#         filename = f"treatments_{payload.patient_id}_{payload.task_id}.csv"
#         filepath = os.path.join(CSV_STORAGE_DIR, filename)

#         with open(filepath, "w", newline="") as csvfile:
#             writer = csv.DictWriter(
#                 csvfile,
#                 fieldnames=["Doctor", "Date", "Diagnosis/Notes", "Treatment"]
#             )
#             writer.writeheader()
#             for a in appointments:
#                 writer.writerow({
#                     "Doctor": a.doctor.user.username,
#                     "Date": a.appointment_date,
#                     "Diagnosis/Notes": a.notes or "",
#                     "Treatment": a.notes or "",
#                 })

#         # Send email
#         csv_bytes = open(filepath, "rb").read()
#         send_email(patient_email, csv_bytes, filename)

#         # Update task result
#         task_results[task_id] = {"status": "completed", "filename": filename}
#         print(f"[OK] CSV sent to {patient_email} and stored as {filename}")

#         return {"message": f"CSV sent to {patient_email}"}

#     except Exception as e:
#         task_results[task_id]["status"] = "failed"
#         print(f"[FAIL] Task {task_id}: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
@app.post("/export-csv")
def export_csv_job(
    payload: ExportCSVRequest,
    session: Session = Depends(get_session)
):
    """Generate CSV of a patient's treatments, email it, and store for download."""
    
    task_results[payload.task_id] = {"status": "pending", "filename": None}

    try:
        patient = session.query(Patient).filter(
            Patient.id == payload.patient_id
        ).first()

        if not patient:
            task_results[payload.task_id]["status"] = "failed"
            raise HTTPException(status_code=404, detail="Patient not found")

        appointments = session.query(Appointment).filter(
            Appointment.patient_id == payload.patient_id
        ).all()

        if not appointments:
            task_results[payload.task_id]["status"] = "completed"
            return {"message": "No treatment records found"}

        # Build CSV
        filename = f"treatments_{payload.patient_id}_{payload.task_id}.csv"
        filepath = os.path.join(CSV_STORAGE_DIR, filename)

        with open(filepath, "w", newline="") as csvfile:
            writer = csv.DictWriter(
                csvfile,
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

        # Send email
        csv_bytes = open(filepath, "rb").read()
        send_email(payload.patient_email, csv_bytes, filename)

        # Update task result
        task_results[payload.task_id] = {
            "status": "completed",
            "filename": filename
        }

        print(
            f"[OK] CSV sent to {payload.patient_email} "
            f"and stored as {filename}"
        )

        return {"message": f"CSV sent to {payload.patient_email}"}

    except Exception as e:
        task_results[payload.task_id]["status"] = "failed"
        print(f"[FAIL] Task {payload.task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# @app.post("/export-csv")
# async def export_csv_job(request: Request):
#     raw = await request.json()
#     print("RAW BODY FROM QSTASH:", raw)

# ----------------- Trigger route: admin clicks button -----------------
@app.post("/trigger-export")
async def trigger_export(request: Request):
    """
    Admin clicks button → send request to QStash → QStash calls /export-csv asynchronously.
    """
    body = await request.json()

    # ✅ Validate input early
    if "patient_id" not in body or "patient_email" not in body:
        raise HTTPException(
            status_code=400,
            detail="patient_id and patient_email are required"
        )

    if not body["patient_email"]:
        raise HTTPException(
            status_code=400,
            detail="patient_email cannot be empty"
        )

    task_id = str(uuid.uuid4())
    task_results[task_id] = {"status": "pending", "filename": None}

    print(f"[INFO] Queuing CSV export task: {task_id}")

    # 🔐 Token remains HERE (as you requested)
    QSTASH_TOKEN = "eyJVc2VySUQiOiJmODlhM2Q5Ni1lMDIxLTQzZWUtYTU1OS0xODEyNjA4MGY1ZjgiLCJQYXNzd29yZCI6IjMzMjNlMzRmMjc2YTRkZDY5ZGYyNjIwYzE3NWJjZDJlIn0="

    DESTINATION_URL = "https://fastapi-6mjn.onrender.com/export-csv"

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"https://qstash.upstash.io/v2/publish/{DESTINATION_URL}",
            headers={
                "Authorization": f"Bearer {QSTASH_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "patient_id": body["patient_id"],
                "patient_email": body["patient_email"],
                "task_id": task_id,
            },
        )

    if res.status_code != 200:
        task_results[task_id]["status"] = "failed"
        return {
            "task_id": task_id,
            "status": "failed to queue",
            "details": res.text,
        }

    return {"task_id": task_id, "status": "queued"}

# ----------------- Status route: check CSV export status -----------------
@app.get("/csv-status/{task_id}")
def csv_status(task_id: str):
    task = task_results.get(task_id)
    if not task:
        return {"task_id": task_id, "status": "unknown"}
    return {"task_id": task_id, "status": task["status"], "filename": task["filename"]}


# ----------------- Download route: admin downloads CSV -----------------
@app.get("/download-csv/{task_id}")
def download_csv(task_id: str):
    task = task_results.get(task_id)
    if not task or task["status"] != "completed":
        raise HTTPException(status_code=404, detail="CSV not ready for download")
    
    filepath = os.path.join(CSV_STORAGE_DIR, task["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="CSV file not found")

    return FileResponse(filepath, filename=task["filename"], media_type="text/csv")


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

from utils.qstash_utils import schedule_job
import os

BACKEND_URL = os.getenv("BACKEND_URL","https://fastapi-6mjn.onrender.com")

def register_jobs():
    # Daily reminders → every day at 8AM
    daily_endpoint = f"{BACKEND_URL}/daily-reminder"
    print("Scheduling daily reminders...")
    print(schedule_job(daily_endpoint, "* * * * *"))

    # Monthly reports → first day of month at 8AM
    monthly_endpoint = f"{BACKEND_URL}/monthly-report"
    print("Scheduling monthly reports...")
    print(schedule_job(monthly_endpoint, "* * * * *"))

if __name__ == "__main__":
    register_jobs()
@app.post("/daily-reminder")
def daily_reminder_job(session: Session = Depends(get_session)):
    """Send daily reminders to patients with appointments today."""
    today = date.today()
    appointments = session.query(Appointment).filter(
        Appointment.appointment_date >= today,
        Appointment.status == "scheduled"
    ).all()

    sent_emails = []

    for a in appointments:
        send_email(
            a.patient.user.email,
            "Appointment Reminder",
            f"Hello {a.patient.user.username}! You have an appointment with Dr. {a.doctor.user.username} today at {a.appointment_date}."
        )
        sent_emails.append(a.patient.user.email)

    return {
        "message": f"{len(appointments)} reminders sent",
        "sent_to": sent_emails
    }

