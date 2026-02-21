import base64
import email as email_lib
from datetime import datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.core.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET


def _build_gmail_service(access_token: str, refresh_token: str):
    """Constrói o cliente autenticado da Gmail API."""
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("gmail", "v1", credentials=credentials)


def _decode_body(payload: dict) -> str:
    """Extrai e decodifica o corpo do e-mail (texto simples ou HTML)."""
    body = ""

    if "parts" in payload:
        for part in payload["parts"]:
            mime_type = part.get("mimeType", "")
            data = part.get("body", {}).get("data", "")
            if mime_type == "text/plain" and data:
                body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                break
            elif mime_type == "text/html" and data:
                # fallback para HTML se não tiver texto simples
                body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    return body


def _parse_headers(headers: list) -> dict:
    """Transforma a lista de headers em um dicionário."""
    return {h["name"].lower(): h["value"] for h in headers}


def fetch_emails(access_token: str, refresh_token: str, max_results: int = 20) -> list[dict]:
    """
    Busca os últimos e-mails do usuário no Gmail.
    Retorna uma lista de dicionários com os dados de cada e-mail.
    """
    service = _build_gmail_service(access_token, refresh_token)

    # 1. Lista os IDs dos e-mails
    result = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        labelIds=["INBOX"],
    ).execute()

    messages = result.get("messages", [])
    emails = []

    # 2. Para cada ID, busca os detalhes completos
    for msg in messages:
        msg_data = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="full",
        ).execute()

        payload = msg_data.get("payload", {})
        headers = _parse_headers(payload.get("headers", []))

        # Converte o timestamp do Gmail (milissegundos) para datetime
        internal_date = msg_data.get("internalDate")
        date = datetime.fromtimestamp(int(internal_date) / 1000) if internal_date else None

        emails.append({
            "gmail_id": msg_data["id"],
            "thread_id": msg_data.get("threadId"),
            "subject": headers.get("subject", "(sem assunto)"),
            "sender": headers.get("from", ""),
            "recipient": headers.get("to", ""),
            "snippet": msg_data.get("snippet", ""),
            "body": _decode_body(payload),
            "date": date,
            "is_read": "UNREAD" not in msg_data.get("labelIds", []),
        })

    return emails