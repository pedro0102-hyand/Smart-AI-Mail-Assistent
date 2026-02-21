from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user_model import User
from app.models.email_model import Email
from app.services.gmail_service import fetch_emails

router = APIRouter(prefix="/emails", tags=["Emails"])


@router.post("/sync")
def sync_emails(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Busca os últimos e-mails do Gmail e salva no banco local.
    E-mails já existentes (mesmo gmail_id) são ignorados.
    """
    # 1. Busca o usuário e seus tokens
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # 2. Busca e-mails no Gmail
    try:
        gmail_emails = fetch_emails(user.access_token, user.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar e-mails: {str(e)}")

    # 3. Salva no banco apenas os novos
    new_count = 0
    for email_data in gmail_emails:
        exists = db.query(Email).filter(Email.gmail_id == email_data["gmail_id"]).first()
        if not exists:
            new_email = Email(user_id=user_id, **email_data)
            db.add(new_email)
            new_count += 1

    db.commit()

    return {"message": f"Sincronização concluída.", "novos_emails": new_count}


@router.get("/")
def list_emails(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20,
):
    """Retorna a lista de e-mails do usuário salvos no banco."""
    emails = (
        db.query(Email)
        .filter(Email.user_id == user_id)
        .order_by(Email.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": e.id,
            "gmail_id": e.gmail_id,
            "subject": e.subject,
            "sender": e.sender,
            "snippet": e.snippet,
            "date": e.date,
            "is_read": e.is_read,
        }
        for e in emails
    ]


@router.get("/{email_id}")
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Retorna os detalhes completos de um e-mail, incluindo o corpo."""
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == user_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="E-mail não encontrado.")

    return {
        "id": email.id,
        "gmail_id": email.gmail_id,
        "subject": email.subject,
        "sender": email.sender,
        "recipient": email.recipient,
        "snippet": email.snippet,
        "body": email.body,
        "date": email.date,
        "is_read": email.is_read,
    }