import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
import app.models.user_model            
import app.models.email_analysis_model  
from app.core.database import SessionLocal
from app.models.email_model import Email
from app.models.email_productivity_model import EmailProductivity
from app.ml.productivity_service import predict_productivity

def main() -> None:
    db = SessionLocal()
    try:
        # Busca e-mails não-spam sem registro de produtividade ainda
        pendentes = (
            db.query(Email)
            .filter(Email.is_spam.is_(False),Email.body.isnot(None),~Email.productivity.has()).all()
        )

        total = len(pendentes)
        if total == 0:
            print("✅ Todos os e-mails já foram classificados. Nada a fazer.")
            return

        print(f"⏳ Carregando modelo mDeBERTa... (pode demorar alguns segundos)\n")
        ok = 0
        erros = 0

        for i, email in enumerate(pendentes, start=1):
            try:
                resultado = predict_productivity(email.subject or "", email.body or "")
                db.add(
                    EmailProductivity(email_id=email.id,is_productive=resultado["is_productive"],productive_score=resultado["productive_score"],label=resultado["label"])
                )
                db.commit()
                icone = "⚡" if resultado["is_productive"] else "💤"
                pct = round(resultado["productive_score"] * 100, 1)
                print(f"[{i:>3}/{total}] {icone} {resultado['label'].upper()} ({pct}%) — {email.subject or '(sem assunto)'!r:.60}")
                ok += 1
            except Exception as exc:
                db.rollback()
                erros += 1
                print(f"[{i:>3}/{total}] ❌ ERRO no email_id={email.id}: {exc}")

        print(f"\n{'=' * 55}")
        print(f"✅ Concluído: {ok} classificados, {erros} erros.")
        print(f"{'=' * 55}")

    finally:
        db.close()

if __name__ == "__main__":
    main()
