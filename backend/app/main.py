from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.routers import auth_router

# Importar todos os models aqui para o Base.metadata os reconhecer
from app.models import user_model  # noqa: F401

app = FastAPI(title="Email Assistant API")

# Criar tabelas automaticamente ao iniciar (sem Alembic por ora)
Base.metadata.create_all(bind=engine)

# CORS — permite o front em localhost:3000 se comunicar com o back
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)


@app.get("/")
def root():
    return {"status": "Email Assistant API rodando ✅"}