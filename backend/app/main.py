from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.core.database import engine, Base
from app.core.config import GOOGLE_REDIRECT_URI
from app.core.security import SECRET_KEY
from app.models import user_model            
from app.models import email_model           
from app.models import email_analysis_model  
from app.models import email_productivity_model
from app.routers import auth_router, email_router, ai_router, productivity_router

app = FastAPI(title="Email Assistant API")

# Criar tabelas automaticamente ao iniciar (sem Alembic por ora)
Base.metadata.create_all(bind=engine)

# CORS — permite o front em localhost:3000 se comunicar com o back
app.include_router(auth_router.router)
app.include_router(email_router.router)
app.include_router(ai_router.router)
app.include_router(productivity_router.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=600,
    https_only=GOOGLE_REDIRECT_URI.startswith("https://") if GOOGLE_REDIRECT_URI else False,
)

@app.get("/")
def root():
    return {"status": "Email Assistant API rodando ✅"}