from pathlib import Path
import re
import joblib
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "spam_model.joblib"
VECTORIZER_PATH = BASE_DIR / "tfidf_vectorizer.joblib"

# Variáveis em memória (cache) para não recarregar o disco a cada requisição
_model = None
_vectorizer = None

def clean_text(text: str) -> str:
    
    if not isinstance(text, str):
        return ""
    
    text = re.sub(r"^(subject|assunto):\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+|www\.\S+", " url_link ", text)
    text = re.sub(r"[^a-zA-Z0-9áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()

def load_models():
    
    global _model, _vectorizer
    if _model is None or _vectorizer is None:
        if not MODEL_PATH.exists() or not VECTORIZER_PATH.exists():
            raise FileNotFoundError("Modelos de spam não encontrados. Execute o treinamento primeiro com ""'python -m app.ml.train_spam_model'")
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)


def predict_spam(subject: str, body: str, threshold: float = 0.50) -> Dict[str, Any]:

    load_models()
    full_text = f"{subject or ''} {body or ''}".strip()
    cleaned = clean_text(full_text)

    if not cleaned:
        return {"is_spam": False, "spam_probability": 0.0, "label": "ham"}

    # Converte o texto limpo na representação numérica TF-IDF
    vec = _vectorizer.transform([cleaned])

    # Calcula as probabilidades matemáticas de cada classe [P(Ham), P(Spam)]
    probabilities = _model.predict_proba(vec)[0]
    spam_prob = float(probabilities[1])
    is_spam = bool(spam_prob >= threshold)

    return {
        "is_spam": is_spam,
        "spam_probability": round(spam_prob, 4),
        "label": "spam" if is_spam else "ham",
    }

if __name__ == "__main__":
    print("=" * 65)
    print("🧪 TESTE INTERATIVO DE PREDIÇÃO (NAIVE BAYES)")
    print("=" * 65)

    test_emails = [
        {
            "title": "Exemplo 1: Phishing bancário / PIX (PT-BR)",
            "subject": "URGENTE: Notificação do seu banco",
            "body": "Identificamos uma transferência PIX suspeita no valor de R$ 4.900,00. Caso não reconheça, acesse o link imediatamente para cancelar: https://meubanco-seguro-cancelamento.com",
        },
        {
            "title": "Exemplo 2: E-mail de Trabalho / Reunião (PT-BR)",
            "subject": "Alinhamento da sprint e cronograma do projeto",
            "body": "Olá equipe, segue o link da chamada de amanhã às 10h para revisarmos a entrega dos novos endpoints da API e alinharmos o cronograma da próxima semana.",
        },
        {
            "title": "Exemplo 3: Taxa de Alfândega / Correios (PT-BR)",
            "subject": "Sua encomenda internacional foi retida",
            "body": "Sua encomenda da Shein aguarda pagamento de tributos na alfândega. Pague o boleto ou PIX em até 24h para liberação: https://correios-rastreio-taxa.com",
        },
        {
            "title": "Exemplo 4: Fatura / Orçamento Legítimo (PT-BR)",
            "subject": "Envio de nota fiscal e orçamento de serviços",
            "body": "Boa tarde Pedro, segue em anexo a nota fiscal eletrônica referente aos serviços prestados no mês anterior, conforme acordado em nosso contrato.",
        },
        {
            "title": "Exemplo 5: Spam clássico de loteria (Inglês)",
            "subject": "CONGRATULATIONS! You won $1,000,000 lottery cash prize",
            "body": "Claim your money now by clicking the link below and entering your personal details to receive bank wire transfer immediately.",
        },
    ]

    for item in test_emails:
        res = predict_spam(item["subject"], item["body"])
        status = "🚨 SPAM" if res["is_spam"] else "✅ LEGÍTIMO (HAM)"
        prob_pct = res["spam_probability"] * 100
        print(f"\n📧 {item['title']}")
        print(f"   Assunto: {item['subject']}")
        print(f"   Resultado: {status} (Probabilidade de Spam: {prob_pct:.2f}%)")
    print("\n" + "=" * 65)

