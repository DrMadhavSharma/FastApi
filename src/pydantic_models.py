from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr
    password: str
class DoctorCreate(UserBase):
    specialization: str
    bio: str | None = None
    availability: str | None = None