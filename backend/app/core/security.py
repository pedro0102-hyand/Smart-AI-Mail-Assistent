from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "troque-essa-chave-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

security = HTTPBearer()


def create_access_token(data: dict) -> str:
    """Gera um JWT com os dados do usuário."""
    to_encode = data.copy() # nao altera dicionario original
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire}) # cria o token e envia ao payload do JWT
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodifica e valida um JWT. Lança exceção se inválido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")


# lendo o header authorization
# extraindo token
# injetando nas credenciasi
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> int:
    """
    Dependency do FastAPI — extrai o user_id do JWT no header Authorization.
    Uso nas rotas: user_id: int = Depends(get_current_user_id)
    """
    payload = decode_access_token(credentials.credentials) # valida o token
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token sem identificação de usuário.")
    return int(user_id)