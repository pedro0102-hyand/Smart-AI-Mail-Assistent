from __future__ import annotations
import re
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

MODEL_NAME = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
CANDIDATE_LABELS = ["produtivo", "improdutivo"]
HYPOTHESIS_TEMPLATE = "Este é um e-mail de comunicação {}."
PRODUCTIVE_THRESHOLD = 0.50
_pipeline = None

def _load_pipeline():
    global _pipeline

    if _pipeline is not None:
        return _pipeline  

    from transformers import pipeline as hf_pipeline

    # carrega o modelo apenas na primeira execucao
    logger.info("Carregando modelo mDeBERTa-v3 para classificação Zero-Shot NLI...")
    logger.info("(Primeira execução: pode levar alguns segundos para baixar ~800 MB)")
    _pipeline = hf_pipeline(task="zero-shot-classification",model=MODEL_NAME,device="cpu",batch_size=1)
    logger.info("Modelo mDeBERTa carregado e pronto para inferência.")
    return _pipeline

def _prepare_text(subject: str, body: str, max_chars: int = 1000) -> str:

    subject = re.sub(r"\s+", " ", subject or "").strip()
    body = body or ""

    # Remove tags HTML
    body = re.sub(r"<[^>]+>", " ", body)

    # Remove URLs
    body = re.sub(r"https?://\S+|www\.\S+", "", body)

    # Remove espaços múltiplos e quebras de linha excessivas
    body = re.sub(r"\s+", " ", body).strip()

    # Combina o assunto com peso duplo e adiciona apenas conteúdo presente.
    parts = [subject, subject] if subject else []
    if body:
        parts.append(body)
    combined = ". ".join(parts)

    # Trunca para evitar ultrapassar os 512 tokens do mDeBERTa
    if len(combined) > max_chars:
        combined = combined[:max_chars]
    return combined

def predict_productivity(subject: str, body: str) -> Dict[str, Any]:

    # Prepara o texto combinando assunto + corpo
    text = _prepare_text(subject, body)

    # Se o e-mail não tem texto aproveitável, considera produtivo por padrão
    if not text.strip():
        return {"is_productive": True,"productive_score": 1.0,"label": "produtivo"}

    try:
        classifier = _load_pipeline()

        # Inferência NLI: o modelo avalia cada label contra o texto
        result = classifier(sequences=text, candidate_labels=CANDIDATE_LABELS, hypothesis_template=HYPOTHESIS_TEMPLATE, multi_label=False)

        # Extrai a probabilidade do label "produtivo"
        label_scores = dict(zip(result["labels"], result["scores"]))
        productive_score = float(label_scores.get("produtivo", 0.0))
        is_productive = productive_score >= PRODUCTIVE_THRESHOLD

        return {
            "is_productive": is_productive,
            "productive_score": round(productive_score, 4),
            "label": "produtivo" if is_productive else "improdutivo",
        }

    except Exception:
        logger.exception("Erro na inferência NLI (mDeBERTa).")
        raise
    
if __name__ == "__main__":
    print("=" * 65)
    print("🧪 TESTE INTERATIVO — ZERO-SHOT NLI (mDeBERTa)")
    print("=" * 65)
    print("⏳ Carregando modelo... (pode levar alguns segundos na 1ª vez)\n")

    test_emails = [
        {
            "title": "E-mail 1: Reunião de trabalho (PT-BR)",
            "subject": "Alinhamento da sprint e revisão do cronograma",
            "body": "Olá equipe, convoco todos para a reunião de amanhã às 10h para revisarmos as entregas da sprint atual e definirmos as prioridades da próxima semana.",
        },
        {
            "title": "E-mail 2: Newsletter / Marketing (PT-BR)",
            "subject": "As melhores ofertas dessa semana esperando por você!",
            "body": "Confira as promoções imperdíveis que separamos especialmente para você: até 70% de desconto em produtos selecionados. Aproveite enquanto durar!",
        },
        {
            "title": "E-mail 3: Nota fiscal / Financeiro (PT-BR)",
            "subject": "Envio de nota fiscal e boleto de cobrança referente ao mês",
            "body": "Prezado cliente, segue em anexo a nota fiscal eletrônica e o boleto de cobrança referente aos serviços prestados no mês de outubro.",
        },
        {
            "title": "E-mail 4: Suporte técnico (PT-BR)",
            "subject": "Chamado #4892 encerrado — problema de acesso ao sistema resolvido",
            "body": "Prezado Pedro, informamos que o chamado aberto para resolução do problema de autenticação no sistema ERP foi encerrado com sucesso pela nossa equipe.",
        },
    ]

    for item in test_emails:

        res = predict_productivity(item["subject"], item["body"])
        status = "⚡ PRODUTIVO" if res["is_productive"] else "💤 IMPRODUTIVO"
        score_pct = res["productive_score"] * 100
        print(f"📧 {item['title']}")
        print(f"   Assunto : {item['subject']}")
        print(f"   Resultado: {status} (Score produtivo: {score_pct:.1f}%)")
        print()

    print("=" * 65)
