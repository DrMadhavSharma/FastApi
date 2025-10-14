from sqlmodel import Field, SQLModel, Relationship, create_engine, Session
from sqlalchemy import ForeignKey
from datetime import datetime
from typing import Annotated
from fastapi import Depends, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select 
from .config import pwd_context
# Database credentials
user = "postgres.dokiquodoqrslfrfofxk"
password = "Quizdb2754"
host = "aws-1-ap-southeast-1.pooler.supabase.com"
port = 5432
dbname = "postgres"

# Sync DB URL (remove asyncpg)
db_url = f"postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode=prefer"

# Synchronous engine
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"}  # needed for Supabase
)

# Sync session
SessionLocal = Session(engine)

# Function to create tables synchronously
def init_db():
    Base.metadata.create_all(engine)

# Example usage
if __name__ == "__main__":
    init_db()
def get_session():
    with Session(engine) as session:
        yield session


# from sqlmodel import SQLModel, Field, Relationship
# from sqlalchemy import ForeignKey
# from datetime import datetime
# from enum import Enum
# from typing import List, Optional

# class Role(str, Enum):
#     admin = "admin"
#     doctor = "doctor"
#     patient = "patient"

# class AppointmentStatus(str, Enum):
#     scheduled = "scheduled"
#     completed = "completed"
#     canceled = "canceled"

# from sqlalchemy.orm import foreign

# class User(SQLModel, table=True):
#     id: int | None = Field(default=None, primary_key=True)
#     name: str
#     role: Role
#     password: str
#     email: str
#     created_at: datetime = Field(default_factory=datetime.utcnow)
#     updated_at: datetime = Field(default_factory=datetime.utcnow)
#     is_active: bool = Field(default=True)

#     # Relationships
#     doctor_appointments: list["Appointment"] = Relationship(
#         back_populates="doctor",
#         sa_relationship_kwargs={
#             "primaryjoin": "User.id == foreign(Appointment.doctor_id)",
#             "foreign_keys": "[Appointment.doctor_id]"
#         }
#     )
#     patient_appointments: list["Appointment"] = Relationship(
#         back_populates="patient",
#         sa_relationship_kwargs={
#             "primaryjoin": "User.id == foreign(Appointment.patient_id)",
#             "foreign_keys": "[Appointment.patient_id]"
#         }
#     )

# class Appointment(SQLModel, table=True):
#     id: int | None = Field(default=None, primary_key=True)
#     doctor_id: int = Field(ForeignKey("user.id"))
#     patient_id: int = Field(ForeignKey("user.id"))
#     appointment_date: datetime
#     status: AppointmentStatus = Field(default=AppointmentStatus.scheduled)
#     notes: str | None = None

#     doctor: User = Relationship(
#         back_populates="doctor_appointments",
#         sa_relationship_kwargs={"foreign_keys": "[Appointment.doctor_id]"}
#     )
#     patient: User = Relationship(
#         back_populates="patient_appointments",
#         sa_relationship_kwargs={"foreign_keys": "[Appointment.patient_id]"}
#     )
# from sqlalchemy import (
#     create_engine, Column, Integer, String, DateTime, Boolean,
#     ForeignKey, Enum
# )
# from sqlalchemy.orm import declarative_base, relationship, sessionmaker
# from datetime import datetime
# import enum

# Base = declarative_base()

# # ------------------------
# # Enums
# # ------------------------
# class RoleEnum(enum.Enum):
#     admin = "admin"
#     doctor = "doctor"
#     patient = "patient"

# class AppointmentStatusEnum(enum.Enum):
#     scheduled = "scheduled"
#     completed = "completed"
#     canceled = "canceled"

# # ------------------------
# # User Table
# # ------------------------
# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, autoincrement=True)
#     name = Column(String, nullable=False)
#     email = Column(String, unique=True, nullable=False)
#     password = Column(String, nullable=False)
#     role = Column(Enum(RoleEnum), nullable=False)
#     is_active = Column(Boolean, default=True)
#     is_verified = Column(Boolean, default=False)
#     specialty = Column(String, nullable=True)  # <- doctor-specific
#     bio = Column(String, nullable=True)
#     created_at = Column(DateTime, default=datetime.utcnow)
#     updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#     last_login = Column(DateTime, nullable=True)

#     # Relationships
#     doctor_appointments = relationship(
#         "Appointment",
#         back_populates="doctor",
#         foreign_keys="Appointment.doctor_id"
#     )
#     patient_appointments = relationship(
#         "Appointment",
#         back_populates="patient",
#         foreign_keys="Appointment.patient_id"
#     )

# # ------------------------
# # Appointment Table
# # ------------------------
# class Appointment(Base):
#     __tablename__ = "appointments"

#     id = Column(Integer, primary_key=True, autoincrement=True)
#     doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     appointment_date = Column(DateTime, nullable=False)
#     status = Column(Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.scheduled)
#     notes = Column(String, nullable=True)

#     # Relationships
#     doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")
#     patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Enum, ForeignKey, Text
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# ------------------------
# Enums
# ------------------------
class RoleEnum(enum.Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"

class AppointmentStatusEnum(enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    canceled = "canceled"

# ------------------------
# General User Table
# ------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    patient_profile = relationship("Patient", back_populates="user", uselist=False)

# ------------------------
# Doctor Table
# ------------------------
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialization = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    availability = Column(Text, nullable=True)  # JSON string of available slots

    # Relationship back to user
    user = relationship("User", back_populates="doctor_profile")
    appointments = relationship("Appointment", back_populates="doctor")

# ------------------------
# Patient Table
# ------------------------
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age = Column(Integer, nullable=True)
    address = Column(String, nullable=True)
    medical_history = Column(Text, nullable=True)

    # Relationship back to user
    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")

# ------------------------
# Appointment Table
# ------------------------
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatusEnum), default=AppointmentStatusEnum.scheduled)
    notes = Column(Text, nullable=True)

    # Relationships
    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
