from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.security import OAuth2PasswordBearer
from models import *
app = FastAPI()
# from routes import *
from fastapi.middleware.cors import CORSMiddleware
from config import hash_password

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes import *
  # noqa: E402
from utils import *

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# from typing import Annotated

# from fastapi import Depends, FastAPI
# from fastapi.security import OAuth2PasswordBearer
# from fastapi.middleware.cors import CORSMiddleware

# from models import *
# from config import hash_password



# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@app.on_event("startup")
def on_startup():
    init_db()
    # Ensure admin exists
    with Session(engine) as db:
        from sqlalchemy import select
        from models import User, RoleEnum
        existing = db.execute(select(User).where(User.role == RoleEnum.admin)).scalar_one_or_none()
        if not existing:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password=hash_password("admin123"),
                role=RoleEnum.admin,
                is_active=True
            )
            db.add(admin_user)
            db.commit()

from routes import *  # noqa: E402




@app.get("/items/")
async def read_items(token: Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}
@app.on_event("startup") 
def on_startup():
   init_db()
   # Ensure one admin user exists (idempotent)
   with Session(engine) as db:
       from sqlalchemy import select
       from models import User, RoleEnum
       existing = db.execute(select(User).where(User.role == RoleEnum.admin)).scalar_one_or_none()
       if not existing:
           admin_user = User(
               username="admin",
               email="admin@example.com",
               password=hash_password("admin123"),
               role=RoleEnum.admin,
               is_active=True
           )
           db.add(admin_user)
           db.commit()
