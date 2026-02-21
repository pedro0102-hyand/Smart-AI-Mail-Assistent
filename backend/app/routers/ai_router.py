from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.email_model import Email
from app.models.email_analysis_model import EmailAnalysis
from app.services.ai_service import summarize_email, classify_email, suggest_reply

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/analyze/{email_id}")
def analyze_email(
    email_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Analisa um e-mail específico com IA:
    gera resumo, classifica e sugere resposta.
    """
    # 1. Busca o e-mail
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == user_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="E-mail não encontrado.")

    if not email.body:
        raise HTTPException(status_code=400, detail="E-mail sem corpo para analisar.")

    # 2. Verifica se já foi analisado
    existing = db.query(EmailAnalysis).filter(EmailAnalysis.email_id == email_id).first()
    if existing:
        return {
            "email_id": email_id,
            "summary": existing.summary,
            "category": existing.category,
            "urgency": existing.urgency,
            "suggested_reply": existing.suggested_reply,
            "cached": True,
        }

    # 3. Chama a IA
    summary = summarize_email(email.body)
    classification = classify_email(email.subject or "", email.body)
    reply = suggest_reply(email.subject or "", email.body)

    # 4. Salva no banco
    analysis = EmailAnalysis(
        email_id=email_id,
        summary=summary,
        category=classification["category"],
        urgency=classification["urgency"],
        suggested_reply=reply,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "email_id": email_id,
        "summary": analysis.summary,
        "category": analysis.category,
        "urgency": analysis.urgency,
        "suggested_reply": analysis.suggested_reply,
        "cached": False,
    }


@router.post("/analyze-all")
def analyze_all_emails(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Analisa todos os e-mails do usuário que ainda não foram analisados.
    Processa em batch — pode demorar alguns segundos.
    """
    # Busca e-mails sem análise
    analyzed_ids = db.query(EmailAnalysis.email_id).subquery()
    emails = (
        db.query(Email)
        .filter(Email.user_id == user_id, Email.id.notin_(analyzed_ids), Email.body != None)
        .all()
    )

    if not emails:
        return {"message": "Todos os e-mails já foram analisados.", "processados": 0}

    count = 0
    errors = 0
    for email in emails:
        try:
            summary = summarize_email(email.body)
            classification = classify_email(email.subject or "", email.body)
            reply = suggest_reply(email.subject or "", email.body)

            analysis = EmailAnalysis(
                email_id=email.id,
                summary=summary,
                category=classification["category"],
                urgency=classification["urgency"],
                suggested_reply=reply,
            )
            db.add(analysis)
            count += 1
        except Exception:
            errors += 1
            continue

    db.commit()

    return {
        "message": "Análise concluída.",
        "processados": count,
        "erros": errors,
    }