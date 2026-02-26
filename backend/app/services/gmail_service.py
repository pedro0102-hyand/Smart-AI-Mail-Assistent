import base64
from email.mime.text import MIMEText
from datetime import datetime

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from fastapi import HTTPException

from app.core.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
from app.core.database import SessionLocal
from app.models.user_model import User


def _build_gmail_service(access_token: str, refresh_token: str, user_id: int | None = None):
    """
    Constrói o serviço Gmail. Se o access_token estiver expirado,
    tenta renová-lo automaticamente usando o refresh_token.
    Se user_id for informado, persiste o novo token no banco.
    """
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )

    # Tenta renovar o token se estiver expirado ou prestes a expirar
    if credentials.expired or not credentials.valid:
        if not credentials.refresh_token:
            raise HTTPException(
                status_code=401,
                detail="Token expirado e sem refresh_token disponível. Faça login novamente.",
            )
        try:
            credentials.refresh(Request())
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Não foi possível renovar o token de acesso: {str(e)}. Faça login novamente.",
            )

        # Persiste o novo access_token no banco se user_id foi fornecido
        if user_id is not None and credentials.token != access_token:
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.access_token = credentials.token
                    db.commit()
            finally:
                db.close()

    return build("gmail", "v1", credentials=credentials)


def _decode_body(payload: dict) -> str:
    """
    Extrai o corpo do e-mail priorizando HTML sobre texto plano.
    Trata também e-mails com partes aninhadas (multipart/alternative dentro de multipart/mixed).
    """
    html_body = ""
    plain_body = ""

    def extract_parts(parts):
        nonlocal html_body, plain_body
        for part in parts:
            mime_type = part.get("mimeType", "")
            if mime_type.startswith("multipart/") and "parts" in part:
                extract_parts(part["parts"])
            else:
                data = part.get("body", {}).get("data", "")
                if data:
                    decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                    if mime_type == "text/html":
                        html_body = decoded
                    elif mime_type == "text/plain" and not html_body:
                        plain_body = decoded

    if "parts" in payload:
        extract_parts(payload["parts"])
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            plain_body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    return html_body or plain_body


def _parse_headers(headers: list) -> dict:
    return {h["name"].lower(): h["value"] for h in headers}


def fetch_emails(
    access_token: str,
    refresh_token: str,
    user_id: int | None = None,
    max_results: int = 20,
) -> list[dict]:
    """Busca os últimos e-mails do usuário no Gmail."""
    service = _build_gmail_service(access_token, refresh_token, user_id)

    try:
        result = service.users().messages().list(
            userId="me",
            maxResults=max_results,
            labelIds=["INBOX"],
        ).execute()
    except HttpError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Erro ao listar e-mails: {e.reason}")

    messages = result.get("messages", [])
    emails = []

    for msg in messages:
        try:
            msg_data = service.users().messages().get(
                userId="me",
                id=msg["id"],
                format="full",
            ).execute()
        except HttpError:
            # Pula mensagens que falharem individualmente sem abortar tudo
            continue

        payload = msg_data.get("payload", {})
        headers = _parse_headers(payload.get("headers", []))
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


def send_email(
    access_token: str,
    refresh_token: str,
    to: str,
    subject: str,
    body: str,
    thread_id: str | None = None,
    user_id: int | None = None,
) -> None:
    """Envia um e-mail via Gmail API."""
    service = _build_gmail_service(access_token, refresh_token, user_id)

    mime_message = MIMEText(body, "plain", "utf-8")
    mime_message["to"] = to
    mime_message["subject"] = subject

    raw = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")
    message_body = {"raw": raw}
    if thread_id:
        message_body["threadId"] = thread_id

    try:
        service.users().messages().send(
            userId="me",
            body=message_body,
        ).execute()
    except HttpError as e:
        raise HTTPException(status_code=e.status_code, detail=f"Erro ao enviar e-mail: {e.reason}")