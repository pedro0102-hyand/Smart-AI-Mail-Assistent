import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import get_current_user_id
from app.ml.productivity_service import predict_productivity
from app.models.email_model import Email
from app.models.email_productivity_model import EmailProductivity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/productivity", tags=["Productivity"])
_jobs: dict[int, dict] = {}


def _run_classify_productivity(user_id: int) -> None:
    db = SessionLocal()
    try:
        pending_ids = [
            row[0]
            for row in db.query(Email.id)
            .filter(
                Email.user_id == user_id,
                Email.is_spam.is_(False),
                Email.body.isnot(None),
                ~Email.productivity.has(),
            )
            .all()
        ]
        total = len(pending_ids)
        _jobs[user_id] = {
            "status": "running",
            "total": total,
            "done": 0,
            "errors": 0,
            "skipped": 0,
        }

        for email_id in pending_ids:
            email = (
                db.query(Email)
                .filter(
                    Email.id == email_id,
                    Email.user_id == user_id,
                    Email.is_spam.is_(False),
                    Email.body.isnot(None),
                    ~Email.productivity.has(),
                )
                .first()
            )
            if email is None:
                _jobs[user_id]["skipped"] += 1
                continue

            try:
                result = predict_productivity(email.subject or "", email.body or "")
                db.add(
                    EmailProductivity(
                        email_id=email.id,
                        is_productive=result["is_productive"],
                        productive_score=result["productive_score"],
                        label=result["label"],
                    )
                )
                db.commit()
                _jobs[user_id]["done"] += 1
            except Exception:
                db.rollback()
                _jobs[user_id]["errors"] += 1
                logger.exception(
                    "Falha ao classificar produtividade do email_id=%d (user_id=%d).",
                    email_id,
                    user_id,
                )

        _jobs[user_id]["status"] = "completed"
        logger.info(
            "Classificação de produtividade concluída para user_id=%d: "
            "%d classificados, %d erros e %d ignorados.",
            user_id,
            _jobs[user_id]["done"],
            _jobs[user_id]["errors"],
            _jobs[user_id]["skipped"],
        )
    except Exception:
        logger.exception(
            "Erro fatal no job de produtividade para user_id=%d.", user_id
        )
        _jobs[user_id] = {"status": "failed"}
    finally:
        db.close()


def schedule_productivity_classification(
    user_id: int,
    db: Session,
    background_tasks: BackgroundTasks,
) -> dict:
    current_job = _jobs.get(user_id)
    if current_job and current_job.get("status") == "running":
        return {"status": "running", "pendentes": current_job.get("total", 0)}

    pending_count = (
        db.query(Email.id)
        .filter(
            Email.user_id == user_id,
            Email.is_spam.is_(False),
            Email.body.isnot(None),
            ~Email.productivity.has(),
        )
        .count()
    )
    if pending_count == 0:
        return {"status": "idle", "pendentes": 0}

    _jobs[user_id] = {
        "status": "running",
        "total": pending_count,
        "done": 0,
        "errors": 0,
        "skipped": 0,
    }
    background_tasks.add_task(_run_classify_productivity, user_id)
    return {"status": "running", "pendentes": pending_count}


@router.post("/classify-all")
def classify_productivity_all(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Classifica em background apenas e-mails não spam ainda não processados."""
    current_job = _jobs.get(user_id)
    if current_job and current_job.get("status") == "running":
        raise HTTPException(
            status_code=409,
            detail="Já existe uma classificação de produtividade em andamento.",
        )

    job = schedule_productivity_classification(user_id, db, background_tasks)
    if job["status"] == "idle":
        return {"message": "Todos os e-mails não spam já foram classificados.", "pendentes": 0}

    return {
        "message": "Classificação de produtividade iniciada em background.",
        "pendentes": job["pendentes"],
        "status_url": "/productivity/classify-all/status",
    }


@router.get("/classify-all/status")
def classify_productivity_status(
    user_id: int = Depends(get_current_user_id),
):
    """Retorna o progresso do job de produtividade do usuário autenticado."""
    job = _jobs.get(user_id)
    if not job:
        return {"status": "idle", "message": "Nenhum job iniciado ainda."}

    response = {
        "status": job["status"],
        "total": job.get("total", 0),
        "done": job.get("done", 0),
        "errors": job.get("errors", 0),
        "skipped": job.get("skipped", 0),
    }
    if job["status"] == "running":
        processed = response["done"] + response["errors"] + response["skipped"]
        response["progress_pct"] = round((processed / response["total"]) * 100) if response["total"] else 0
    return response
