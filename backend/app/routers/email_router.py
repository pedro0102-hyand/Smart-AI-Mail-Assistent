from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user_model import User
from app.models.email_model import Email
from app.models.email_analysis_model import EmailAnalysis
from app.services.gmail_service import fetch_emails, send_email

router = APIRouter(prefix="/emails", tags=["Emails"])


@router.post("/sync")
def sync_emails(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Busca os últimos e-mails do Gmail e salva no banco local."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    try:
        gmail_emails = fetch_emails(user.access_token, user.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar e-mails: {str(e)}")

    new_count = 0
    for email_data in gmail_emails:
        exists = db.query(Email).filter(Email.gmail_id == email_data["gmail_id"]).first()
        if not exists:
            new_email = Email(user_id=user_id, **email_data)
            db.add(new_email)
            new_count += 1

    db.commit()
    return {"message": "Sincronização concluída.", "novos_emails": new_count}


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Retorna contagem de e-mails por categoria e urgência para o dashboard."""
    by_category = (
        db.query(EmailAnalysis.category, func.count(EmailAnalysis.id).label("total"))
        .join(Email, Email.id == EmailAnalysis.email_id)
        .filter(Email.user_id == user_id)
        .group_by(EmailAnalysis.category)
        .all()
    )

    by_urgency = (
        db.query(EmailAnalysis.urgency, func.count(EmailAnalysis.id).label("total"))
        .join(Email, Email.id == EmailAnalysis.email_id)
        .filter(Email.user_id == user_id)
        .group_by(EmailAnalysis.urgency)
        .all()
    )

    total = db.query(func.count(Email.id)).filter(Email.user_id == user_id).scalar()
    unread = db.query(func.count(Email.id)).filter(Email.user_id == user_id, Email.is_read == False).scalar()

    return {
        "total_emails": total,
        "unread": unread,
        "by_category": {row.category: row.total for row in by_category},
        "by_urgency": {row.urgency: row.total for row in by_urgency},
    }


@router.get("/")
def list_emails(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    skip: int = 0,
    limit: int = 20,
):
    """Retorna lista de e-mails com análise da IA incluída."""
    emails = (
        db.query(Email)
        .options(joinedload(Email.analysis))
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
            "analysis": {
                "summary": e.analysis.summary,
                "category": e.analysis.category,
                "urgency": e.analysis.urgency,
            } if e.analysis else None,
        }
        for e in emails
    ]


@router.get("/{email_id}")
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Retorna detalhes completos de um e-mail incluindo corpo e análise da IA."""
    email = (
        db.query(Email)
        .options(joinedload(Email.analysis))
        .filter(Email.id == email_id, Email.user_id == user_id)
        .first()
    )
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
        "analysis": {
            "summary": email.analysis.summary,
            "category": email.analysis.category,
            "urgency": email.analysis.urgency,
            "suggested_reply": email.analysis.suggested_reply,
        } if email.analysis else None,
    }


@router.post("/{email_id}/reply")
def reply_email(
    email_id: int,
    body: dict,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Envia uma resposta a um e-mail via Gmail API.
    Body: {"message": "texto da resposta"}
    """
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == user_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="E-mail não encontrado.")

    message_text = body.get("message")
    if not message_text:
        raise HTTPException(status_code=400, detail="Campo 'message' é obrigatório.")

    user = db.query(User).filter(User.id == user_id).first()

    try:
        send_email(
            access_token=user.access_token,
            refresh_token=user.refresh_token,
            to=email.sender,
            subject=f"Re: {email.subject}",
            body=message_text,
            thread_id=email.thread_id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao enviar e-mail: {str(e)}")

    return {"message": "E-mail enviado com sucesso."}