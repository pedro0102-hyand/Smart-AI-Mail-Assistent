from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not _SECRET_KEY:
    raise RuntimeError(
        "Variável de ambiente JWT_SECRET_KEY não definida. "
        "Adicione-a ao seu arquivo .env antes de iniciar o servidor."
    )

SECRET_KEY = _SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

security = HTTPBearer()


def create_access_token(data: dict) -> str:
    """Gera um JWT com os dados do usuário."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodifica e valida um JWT. Lança exceção se inválido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> int:
    """
    Dependency do FastAPI — extrai o user_id do JWT no header Authorization.
    Uso nas rotas: user_id: int = Depends(get_current_user_id)
    """
    payload = decode_access_token(credentials.credentials)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token sem identificação de usuário.")
    return int(user_id)