"""Outbound email.

When SMTP is not configured (the default for local development) the message is
written to the application log instead of being sent, so the whole
forgot-password flow is testable without credentials.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("stocksense.mailer")


def send_email(to: str, subject: str, body: str) -> None:
    if not settings.smtp_configured:
        logger.warning(
            "SMTP not configured - email not sent. "
            "To: %s | Subject: %s\n%s",
            to,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)

    logger.info("Sent %r email to %s", subject, to)


def send_password_reset_otp(to: str, name: str, code: str, expires_minutes: int) -> None:
    subject = "Your StockSense password reset code"
    body = (
        f"Hi {name},\n\n"
        f"Your StockSense password reset code is: {code}\n\n"
        f"It expires in {expires_minutes} minutes and can only be used once.\n"
        "If you did not request a password reset, you can safely ignore this email.\n\n"
        "-- StockSense"
    )
    send_email(to, subject, body)
