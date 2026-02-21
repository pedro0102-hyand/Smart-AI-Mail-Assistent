import google.generativeai as genai 
from app.core.config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

def _call_gemini(prompt: str) -> str:

    response = model.generate_content(prompt)
    return response.text.strip()

def summarize_email(body: str) -> str:
    """Gera um resumo curto do e-mail em português."""
    prompt = f"""
Você é um assistente que resume e-mails de forma clara e objetiva.
Resuma o e-mail abaixo em no máximo 3 frases em português.
Seja direto e destaque apenas o que é mais importante.

E-MAIL:
{body}

RESUMO:
"""
    return _call_gemini(prompt)

def classify_email(subject: str, body: str) -> dict:
    """
    Classifica o e-mail em categoria e urgência.
    Retorna: {"category": "...", "urgency": "..."}
    """
    prompt = f"""
Você é um assistente que classifica e-mails.
Analise o e-mail abaixo e retorne EXATAMENTE neste formato JSON (sem markdown, sem explicações):
{{"category": "CATEGORIA", "urgency": "URGENCIA"}}

Categorias possíveis: trabalho, financeiro, pessoal, marketing, spam, suporte, outro
Urgências possíveis: alta, média, baixa

ASSUNTO: {subject}
E-MAIL: {body}
"""
    import json
    raw = _call_gemini(prompt)

    # Remove possíveis marcadores de código
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
        return {
            "category": result.get("category", "outro"),
            "urgency": result.get("urgency", "baixa"),
        }
    except json.JSONDecodeError:
        return {"category": "outro", "urgency": "baixa"}

def suggest_reply(subject: str, body: str) -> str:
    """Gera um rascunho de resposta para o e-mail em português."""
    prompt = f"""
Você é um assistente profissional de e-mails.
Escreva um rascunho de resposta para o e-mail abaixo em português.
Seja educado, profissional e conciso. Não inclua assunto, apenas o corpo da resposta.

ASSUNTO: {subject}
E-MAIL RECEBIDO:
{body}

RASCUNHO DE RESPOSTA:
"""
    return _call_gemini(prompt)