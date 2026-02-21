from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import requests

from app.services.google_auth_service import get_google_auth_flow
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user_model import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/google")
def auth_google():
    """Inicia o fluxo OAuth2 — redireciona o usuário para o Google."""
    flow = get_google_auth_flow()
    auth_url, _ = flow.authorization_url(prompt="consent")
    return RedirectResponse(auth_url)


@router.get("/callback")
def auth_callback(code: str, db: Session = Depends(get_db)):
    """
    Recebe o código do Google, troca por tokens,
    busca dados do usuário, salva no banco e retorna um JWT.
    """
    # 1. Trocar código por tokens
    flow = get_google_auth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # 2. Buscar dados do perfil via Google API
    userinfo_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {credentials.token}"},
    )
    if not userinfo_response.ok:
        raise HTTPException(status_code=400, detail="Falha ao buscar dados do usuário no Google.")

    userinfo = userinfo_response.json()
    google_id = userinfo["id"]
    email = userinfo["email"]
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    # 3. Criar ou atualizar usuário no banco
    user = db.query(User).filter(User.google_id == google_id).first()

    if user:
        # Atualiza tokens (podem ter sido renovados)
        user.access_token = credentials.token
        user.refresh_token = credentials.refresh_token or user.refresh_token
        user.name = name
        user.picture = picture
    else:
        user = User(
            email=email,
            name=name,
            picture=picture,
            google_id=google_id,
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # 4. Gerar JWT próprio da aplicação
    jwt_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    # 5. Redirecionar pro front com o token na URL
    # (o front salva no localStorage e usa nas próximas requisições)
    frontend_url = f"http://localhost:3000/auth/success?token={jwt_token}"
    return RedirectResponse(frontend_url)


@router.get("/me")
def get_me(db: Session = Depends(get_db), user_id: int = Depends(lambda: None)):
    """Rota de exemplo protegida — retorna dados do usuário logado."""
    # Implementado completamente na Fase 3 com Depends(get_current_user_id)
    pass