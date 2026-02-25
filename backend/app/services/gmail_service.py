import base64
from email.mime.text import MIMEText
from datetime import datetime
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.core.config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET


def _build_gmail_service(access_token: str, refresh_token: str):
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("gmail", "v1", credentials=credentials)


def _decode_body(payload: dict) -> str:
    """Extrai o corpo do e-mail priorizando HTML sobre texto plano.
    Trata também e-mails com partes aninhadas (multipart/alternative dentro de multipart/mixed).
    """
    html_body = ""
    plain_body = ""

    def extract_parts(parts):
        nonlocal html_body, plain_body
        for part in parts:
            mime_type = part.get("mimeType", "")
            # Recursão para partes aninhadas (ex: multipart/alternative)
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

    # Prioriza HTML; cai para texto plano se não houver HTML
    return html_body or plain_body


def _parse_headers(headers: list) -> dict:
    return {h["name"].lower(): h["value"] for h in headers}


def fetch_emails(access_token: str, refresh_token: str, max_results: int = 20) -> list[dict]:
    """Busca os últimos e-mails do usuário no Gmail."""
    service = _build_gmail_service(access_token, refresh_token)

    result = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        labelIds=["INBOX"],
    ).execute()

    messages = result.get("messages", [])
    emails = []

    for msg in messages:
        msg_data = service.users().messages().get(
            userId="me",
            id=msg["id"],
            format="full",
        ).execute()

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
    thread_id: str = None,
) -> None:
    """Envia um e-mail via Gmail API."""
    service = _build_gmail_service(access_token, refresh_token)

    mime_message = MIMEText(body, "plain", "utf-8")
    mime_message["to"] = to
    mime_message["subject"] = subject

    raw = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")

    message_body = {"raw": raw}
    if thread_id:
        message_body["threadId"] = thread_id

    service.users().messages().send(
        userId="me",
        body=message_body,
    ).execute()