import os
import uuid
import time
import base64
import smtplib
import ssl
import email.utils
from email.message import EmailMessage

MESSAGE_ID_DOMAIN = os.getenv("MESSAGE_ID_DOMAIN", "example.local")


def _rfc2822_date() -> str:
    return email.utils.formatdate(localtime=False, usegmt=True)


def _as_str(v):
    """Normalizes any value to a string, handling various editor formats."""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return "".join(str(x) for x in v)
    if isinstance(v, dict):
        # Handle Quill Delta format (minimal support)
        if "ops" in v and isinstance(v["ops"], list):
            return "".join(str(op.get("insert", "")) for op in v["ops"])
        return str(v)
    return str(v)


def build_mime(req) -> tuple[EmailMessage, str]:
    msg = EmailMessage()
    from_disp = f"{req.from_name} <{req.from_email}>" if getattr(req, "from_name", None) else req.from_email
    msg["From"] = from_disp
    msg["To"] = ", ".join(req.to)
    msg["Subject"] = req.subject
    msg["Date"] = _rfc2822_date()

    # Our own RFC-compliant Message-ID
    raw_id = f"{uuid.uuid4().hex}.{int(time.time())}"
    msg_id = f"<{raw_id}@{MESSAGE_ID_DOMAIN}>"
    msg["Message-ID"] = msg_id

    # Custom headers (do not allow overriding Message-ID)
    for k, v in (getattr(req, "custom_headers", {}) or {}).items():
        if k.lower() == "message-id":
            continue
        msg[k] = v

    # Normalize HTML and text from various formats
    html = _as_str(getattr(req, "html", None))
    text = _as_str(getattr(req, "text", None))

    if html and text:
        msg.set_content(text)
        msg.add_alternative(html, subtype="html")
    elif html:
        # HTML-only: provide a fallback plain text
        msg.set_content("This email contains HTML content.")
        msg.add_alternative(html, subtype="html")
    else:
        msg.set_content(text or "")
    return msg, msg_id


def to_gmail_raw(msg: EmailMessage) -> str:
    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")


def send_via_smtp(msg: EmailMessage):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    pwd = os.getenv("SMTP_PASS")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    if not host:
        raise RuntimeError("SMTP_HOST is not configured")

    if use_tls:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(host, port) as s:
            s.starttls(context=ctx)
            if user and pwd:
                s.login(user, pwd)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as s:
            if user and pwd:
                s.login(user, pwd)
            s.send_message(msg)


