from main import app
from typing import Annotated
from config import hash_password
from fastapi import Depends, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select 
from models import * 
from pydantic_models import UserBase, DoctorCreate
SessionDep = Annotated[Session, Depends(get_session)]
@app.get("/")
def index_page():
    return {"message": "Welcome to the Hospital Management Application!"}
@app.get("/login")
def login_page():
    return {"message": "Login Page"}

# @app.post("/register/doctor")
# def register_doctor(doctor: DoctorCreate, db: Session = Depends(get_session)):
#     # Check if user with same email exists
#     existing_user = db.exec(select(User).where(User.email == doctor.email)).first()
#     if existing_user:
#         raise HTTPException(status_code=400, detail="Email already registered")

#     # Create User entry
#     db_user = User(
#         role="doctor",
#         name=doctor.username,
#         email=doctor.email,
#         password=hash_password(doctor.password),
#         specialty=doctor.specialty,
#         bio=doctor.bio

#     )
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)  # Get the generated id

    

#     return {
#         "msg": "Doctor registered successfully",
#         "d_user_id": db_user.id
#     }
@app.post("/register/doctor")
def register_doctor(doctor: DoctorCreate, db: Session = Depends(get_session)):
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
        "user_id": db_user.id,
        "doctor_id": db_doctor.id
    }
@app.post("/patientregister")
def p_register_page():
    return {"message": "Register Page"}
# @app.post("/heroes/")
# def create_hero(hero: Hero, session: SessionDep) -> Hero:
#     session.add(hero)
#     session.commit()
#     session.refresh(hero)
#     return hero


# @app.get("/heroes/")
# def read_heroes(
#     session: SessionDep,
#     offset: int = 0,
#     limit: Annotated[int, Query(le=100)] = 100,
# ) -> list[Hero]:
#     heroes = session.exec(select(Hero).offset(offset).limit(limit)).all()
#     return heroes


# @app.get("/heroes/{hero_id}")
# def read_hero(hero_id: int, session: SessionDep) -> Hero:
#     hero = session.get(Hero, hero_id)
#     if not hero:
#         raise HTTPException(status_code=404, detail="Hero not found")
#     return hero


# @app.delete("/heroes/{hero_id}")
# def delete_hero(hero_id: int, session: SessionDep):
#     hero = session.get(Hero, hero_id)
#     if not hero:
#         raise HTTPException(status_code=404, detail="Hero not found")
#     session.delete(hero)
#     session.commit()
#     return {"ok": True}