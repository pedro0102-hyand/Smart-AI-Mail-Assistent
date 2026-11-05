import json
import time
import logging
import warnings

# Suprime aviso de depreciação do SDK google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning)

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable, DeadlineExceeded
from app.core.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel(
    "gemini-2.5-flash-lite",
    generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.6,
    },
)

# Configurações de retry
_MAX_RETRIES = 3
_RETRY_EXCEPTIONS = (ResourceExhausted, ServiceUnavailable, DeadlineExceeded)
_INITIAL_WAIT = 2  # segundos

VALID_CATEGORIES = {"trabalho", "financeiro", "pessoal", "marketing", "suporte", "spam", "outro"}
VALID_URGENCIES = {"alta", "média", "baixa"}


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
            logger.error("Erro não recuperável na Gemini API: %s", str(e))
            raise

    logger.error(
        "Gemini API falhou após %d tentativas. Último erro: %s",
        _MAX_RETRIES, str(last_exception),
    )
    raise last_exception


def _build_prompt(
    subject: str,
    body: str,
    is_spam: bool | None = None,
    is_productive: bool | None = None,
) -> str:
    """Constrói prompt detalhado com taxonomia estrita, contexto das outras camadas de ML e regras de resposta."""
    context_lines = []
    if is_spam is not None:
        context_lines.append(f"- Pré-classificação Naive Bayes Spam: {'SIM (Spam/Phishing provável)' if is_spam else 'NÃO (E-mail legítimo)'}")
    if is_productive is not None:
        context_lines.append(f"- Avaliação de Produtividade mDeBERTa: {'PRODUTIVO' if is_productive else 'NÃO PRODUTIVO'}")

    context_str = "\n".join(context_lines) if context_lines else "Nenhum sinal prévio disponível."

    return f"""Você é um assistente executivo inteligente de triagem e análise de e-mails corporativos.
Analise o e-mail fornecido e responda ESTRITAMENTE em formato JSON com as seguintes chaves:

1. "summary": Resumo conciso em 1 a 3 frases em português (BR), objetivo e factual, informando o que foi comunicado e eventuais prazos ou pedidos de ação.
2. "category": Escolha OBRIGATORIAMENTE uma das 7 opções abaixo:
   - "trabalho": Demandas profissionais, reuniões, sprints, alinhamentos com equipes, clientes, projetos ou propostas profissionais.
   - "financeiro": Boletos, notas fiscais, faturas, extratos, confirmações de pagamento ou cobranças (incluindo golpes que simulam bancos ou boletos).
   - "pessoal": Mensagens diretas de conhecidos, amigos, familiares ou conversas pessoais sem cunho comercial.
   - "marketing": Newsletters, promoções, cupons, lançamentos de produtos, propagandas e e-mails comerciais.
   - "suporte": Chamados técnicos, tickets de SAC, avisos de instabilidade de sistemas, redefinições de senhas solicitadas.
   - "spam": Fraudes genéricas (loterias falsas, heranças, correntes) ou lixo eletrônico sem tema comercial/financeiro específico.
   - "outro": Notificações automáticas de termos de serviço, alertas institucionais ou que não caibam nas anteriores.

   IMPORTANTE SOBRE SPAM: A classificação de categoria deve ser aplicada tanto a e-mails legítimos quanto a spams. Se o e-mail for um phishing de banco ou boleto falso, a categoria temática é "financeiro"; se for propaganda não solicitada, é "marketing"; se for phishing de suporte/senha, é "suporte".

3. "urgency": Escolha OBRIGATORIAMENTE uma opção:
   - "alta": Requer ação imediata ou tem prazo crítico hoje/amanhã, alertas de segurança reais, bloqueios operacionais urgentes.
   - "média": Requer atenção nos próximos dias (24h a 48h), tarefas com prazo flexível ou agendamentos futuros.
   - "baixa": Puramente informativo, newsletters, confirmações de rotina, recibos já pagos, marketing ou spam/phishing.

4. "suggested_reply": 
   - Se o e-mail for spam/phishing, marketing, newsletter, notificação automática "no-reply" ou não exigir resposta, retorne string vazia "".
   - Se o e-mail for uma comunicação legítima que convide ou demande resposta, elabore um rascunho educado, profissional e direto em português (apenas o corpo da resposta, sem campo de assunto nem cabeçalho).

SINAIS DAS CAMADAS DE ML ANTERIORES:
{context_str}

CONTEÚDO DO E-MAIL:
ASSUNTO: {subject or "(sem assunto)"}
CORPO:
{body or "(sem corpo)"}
"""


def analyze_email(
    subject: str,
    body: str,
    is_spam: bool | None = None,
    is_productive: bool | None = None,
) -> dict:
    """
    Faz resumo, classificação categórica e sugestão de resposta em chamada única à Gemini API,
    integrando sinais dos modelos Naive Bayes e mDeBERTa para maior assertividade.
    """
    prompt = _build_prompt(subject, body, is_spam=is_spam, is_productive=is_productive)
    raw = _call_gemini(prompt)

    try:
        result = json.loads(raw)

        # Normalização e validação das chaves
        category = str(result.get("category", "outro")).strip().lower()
        if category not in VALID_CATEGORIES:
            category = "outro"

        urgency = str(result.get("urgency", "baixa")).strip().lower()
        if urgency not in VALID_URGENCIES:
            urgency = "baixa"

        summary = str(result.get("summary", "")).strip() or "Não foi possível gerar um resumo."
        suggested_reply = str(result.get("suggested_reply", "")).strip()

        # Salvaguarda: se for spam detectado, nunca sugerir responder ao remetente
        if is_spam and suggested_reply:
            suggested_reply = ""

        return {
            "summary": summary,
            "category": category,
            "urgency": urgency,
            "suggested_reply": suggested_reply,
        }

    except (json.JSONDecodeError, Exception) as exc:
        logger.error("Falha ao decodificar JSON retornado pelo Gemini: %s (Raw: %s)", exc, raw)
        return {
            "summary": "Não foi possível analisar este e-mail.",
            "category": "outro",
            "urgency": "baixa",
            "suggested_reply": "",
        }

def summarize_email(body: str) -> str:
    result = analyze_email("", body)
    return result["summary"]

def classify_email(subject: str, body: str) -> dict:
    result = analyze_email(subject, body)
    return {"category": result["category"], "urgency": result["urgency"]}

def suggest_reply(subject: str, body: str) -> str:
    result = analyze_email(subject, body)
    return result["suggested_reply"]
