import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.security import get_current_user_id
from app.models.email_model import Email
from app.models.email_analysis_model import EmailAnalysis
from app.services.ai_service import analyze_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])

# Dicionário em memória para rastrear o progresso dos jobs em background.
# Chave: user_id | Valor: dict com status do job
# Nota: em produção com múltiplos workers, substituir por Redis.
_jobs: dict[int, dict] = {}


def _run_analyze_all(user_id: int) -> None:
    """
    Função executada em background pelo FastAPI BackgroundTasks.
    Usa sua própria sessão de banco, independente da requisição HTTP.
    """
    db = SessionLocal()
    try:
        analyzed_ids = db.query(EmailAnalysis.email_id).subquery()
        emails = (
            db.query(Email)
            .filter(
                Email.user_id == user_id,
                Email.id.notin_(analyzed_ids),
                Email.body.isnot(None),
            )
            .all()
        )

        total = len(emails)
        _jobs[user_id] = {"status": "running", "total": total, "done": 0, "errors": 0}

        if total == 0:
            _jobs[user_id]["status"] = "completed"
            return

        for email in emails:
            try:
                result = analyze_email(email.subject or "", email.body)

                analysis = EmailAnalysis(
                    email_id=email.id,
                    summary=result["summary"],
                    category=result["category"],
                    urgency=result["urgency"],
                    suggested_reply=result["suggested_reply"],
                )
                db.add(analysis)
                db.commit()
                _jobs[user_id]["done"] += 1

            except Exception as e:
                db.rollback()
                _jobs[user_id]["errors"] += 1
                logger.error(
                    "Falha ao analisar email_id=%d (user_id=%d): %s",
                    email.id, user_id, str(e),
                )

        _jobs[user_id]["status"] = "completed"
        logger.info(
            "analyze-all concluído para user_id=%d: %d analisados, %d erros.",
            user_id, _jobs[user_id]["done"], _jobs[user_id]["errors"],
        )

    except Exception as e:
        logger.error("Erro fatal no job analyze-all para user_id=%d: %s", user_id, str(e))
        _jobs[user_id] = {"status": "failed", "error": str(e)}
    finally:
        db.close()


@router.post("/analyze/{email_id}")
def analyze_single_email(
    email_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Analisa um e-mail específico com IA:
    gera resumo, classifica e sugere resposta.
    """
    email = db.query(Email).filter(Email.id == email_id, Email.user_id == user_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="E-mail não encontrado.")
    if not email.body:
        raise HTTPException(status_code=400, detail="E-mail sem corpo para analisar.")

    # Retorna cache se já analisado
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

    # Análise em chamada única à Gemini
    result = analyze_email(email.subject or "", email.body)

    analysis = EmailAnalysis(
        email_id=email_id,
        summary=result["summary"],
        category=result["category"],
        urgency=result["urgency"],
        suggested_reply=result["suggested_reply"],
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    Dispara a análise de todos os e-mails pendentes em background.
    Retorna imediatamente — use GET /ai/analyze-all/status para acompanhar.
    """
    # Impede múltiplos jobs simultâneos para o mesmo usuário
    current_job = _jobs.get(user_id)
    if current_job and current_job.get("status") == "running":
        raise HTTPException(
            status_code=409,
            detail="Já existe uma análise em andamento para este usuário.",
        )

    analyzed_ids = db.query(EmailAnalysis.email_id).subquery()
    pending_count = (
        db.query(Email)
        .filter(
            Email.user_id == user_id,
            Email.id.notin_(analyzed_ids),
            Email.body.isnot(None),
        )
        .count()
    )

    if pending_count == 0:
        return {"message": "Todos os e-mails já foram analisados.", "pendentes": 0}

    _jobs[user_id] = {"status": "running", "total": pending_count, "done": 0, "errors": 0}
    background_tasks.add_task(_run_analyze_all, user_id)

    return {
        "message": "Análise iniciada em background.",
        "pendentes": pending_count,
        "status_url": "/ai/analyze-all/status",
    }


@router.get("/analyze-all/status")
def analyze_all_status(
    user_id: int = Depends(get_current_user_id),
):
    """
    Retorna o progresso do job de análise em background para o usuário autenticado.
    """
    job = _jobs.get(user_id)
    if not job:
        return {"status": "idle", "message": "Nenhum job iniciado ainda."}

    response = {"status": job["status"]}

    if job["status"] == "running":
        total = job.get("total", 0)
        done = job.get("done", 0)
        response["total"] = total
        response["done"] = done
        response["errors"] = job.get("errors", 0)
        response["progress_pct"] = round((done / total) * 100) if total > 0 else 0

    elif job["status"] == "completed":
        response["total"] = job.get("total", 0)
        response["done"] = job.get("done", 0)
        response["errors"] = job.get("errors", 0)

    elif job["status"] == "failed":
        response["error"] = job.get("error", "Erro desconhecido.")

    return response