from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime, timezone
class UserBase(BaseModel):
    username: str
    email: EmailStr
    password: str
class DoctorCR(UserBase):
    specialization: str
    bio: str | None = None
    availability: str | None = None
    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects

class PatientCR(UserBase):
    age :int |None=None
    address :str |None=None
    medical_history :str 
    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects
class DoctorUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    specialization: str | None = None
    bio: str | None = None
    availability: str | None = None
    model_config = ConfigDict(from_attributes=True)

class PatientUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    age: int | None = None
    address: str | None = None
    medical_history: str | None = None
    model_config = ConfigDict(from_attributes=True)
class Login(BaseModel):
    email: EmailStr
    password: str
class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects
class DoctorOut(BaseModel):
    specialization: str
    bio: str | None = None
    availability: str | None = None

    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects
class PatientOut(BaseModel):
    age :int |None=None
    address :str |None=None
    medical_history :str 
    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects
class DoctorCombined(BaseModel):
    user: UserOut
    doctor: DoctorOut
    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects
class PatientCombined(BaseModel):
    user:UserOut
    patient:PatientCR
    model_config = ConfigDict(from_attributes=True)  # this allows conversion from ORM objects

class AppointmentBook(BaseModel):
    doctor_id: int
    appointment_date: str
    notes: str | None = None

class AppointmentStatusUpdate(BaseModel):
    status: str  # e.g., "scheduled", "completed", "canceled"

from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    username: str
    email: EmailStr
    password: str


class DoctorCR(UserBase):
    specialization: str
    bio: str | None = None
    availability: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PatientCR(UserBase):
    age: int | None = None
    address: str | None = None
    medical_history: str | None = None
    model_config = ConfigDict(from_attributes=True)


class Login(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class DoctorOut(BaseModel):
    specialization: str
    bio: str | None = None
    availability: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PatientOut(BaseModel):
    age: int | None = None
    address: str | None = None
    medical_history: str | None = None
    model_config = ConfigDict(from_attributes=True)


class DoctorCombined(BaseModel):
    user: UserOut
    doctor: DoctorOut
    model_config = ConfigDict(from_attributes=True)


class PatientCombined(BaseModel):
    user: UserOut
    patient: PatientOut
    model_config = ConfigDict(from_attributes=True)


class DoctorUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    specialization: str | None = None
    bio: str | None = None
    availability: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PatientUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    age: int | None = None
    address: str | None = None
    medical_history: str | None = None
    model_config = ConfigDict(from_attributes=True)


