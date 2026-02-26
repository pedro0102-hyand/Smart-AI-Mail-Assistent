import json
import time
import logging

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable, DeadlineExceeded

from app.core.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash-lite")

# Configurações de retry
_MAX_RETRIES = 3
_RETRY_EXCEPTIONS = (ResourceExhausted, ServiceUnavailable, DeadlineExceeded)
_INITIAL_WAIT = 2  # segundos


def _call_gemini(prompt: str) -> str:
    """
    Chama a Gemini API com retry automático e backoff exponencial.
    Trata rate limit (429), timeout e indisponibilidade do serviço.
    """
    last_exception = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()

        except _RETRY_EXCEPTIONS as e:
            last_exception = e
            wait = _INITIAL_WAIT * (2 ** (attempt - 1))  # 2s → 4s → 8s
            logger.warning(
                "Gemini API indisponível (tentativa %d/%d): %s. Aguardando %ds...",
                attempt, _MAX_RETRIES, type(e).__name__, wait,
            )
            time.sleep(wait)

        except Exception as e:
            # Erros que não devem ser retentados (ex: API key inválida, prompt bloqueado)
            logger.error("Erro não recuperável na Gemini API: %s", str(e))
            raise

    logger.error(
        "Gemini API falhou após %d tentativas. Último erro: %s",
        _MAX_RETRIES, str(last_exception),
    )
    raise last_exception


def analyze_email(subject: str, body: str) -> dict:
    """
    Faz resumo, classificação e sugestão de resposta em uma única chamada à API,
    reduzindo custo e latência em ~3x comparado a chamadas separadas.

    Retorna: {"summary": "...", "category": "...", "urgency": "...", "suggested_reply": "..."}
    """
    prompt = f"""
Você é um assistente de e-mails profissional. Analise o e-mail abaixo e responda SOMENTE com um JSON válido, sem markdown, sem explicações.

O JSON deve ter exatamente estas chaves:
- "summary": resumo em no máximo 3 frases em português, direto e objetivo
- "category": uma das opções — trabalho, financeiro, pessoal, marketing, spam, suporte, outro
- "urgency": uma das opções — alta, média, baixa
- "suggested_reply": rascunho de resposta profissional em português, apenas o corpo (sem assunto)

ASSUNTO: {subject}
E-MAIL:
{body}
"""
    raw = _call_gemini(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
        return {
            "summary": result.get("summary", "Não foi possível gerar um resumo."),
            "category": result.get("category", "outro"),
            "urgency": result.get("urgency", "baixa"),
            "suggested_reply": result.get("suggested_reply", ""),
        }
    except json.JSONDecodeError:
        logger.error("Resposta da Gemini não é JSON válido: %s", raw)
        return {
            "summary": "Não foi possível analisar este e-mail.",
            "category": "outro",
            "urgency": "baixa",
            "suggested_reply": "",
        }


# Mantém as funções individuais como wrappers para não quebrar
# chamadas existentes em outros pontos do código
def summarize_email(body: str) -> str:
    result = analyze_email("", body)
    return result["summary"]


def classify_email(subject: str, body: str) -> dict:
    result = analyze_email(subject, body)
    return {"category": result["category"], "urgency": result["urgency"]}


def suggest_reply(subject: str, body: str) -> str:
    result = analyze_email(subject, body)
    return result["suggested_reply"]