import os
import base64
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition

SENDGRID_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "23f3004142@ds.study.iitm.ac.in")

sg = SendGridAPIClient(SENDGRID_KEY)

def send_email(to_email, subject, content, html=False):
    """Send a plain text or HTML email."""
    msg = Mail(from_email=FROM_EMAIL, to_emails=to_email, subject=subject)
    if html:
        msg.add_content(content, "text/html")
    else:
        msg.add_content(content, "text/plain")
    sg.send(msg)

def send_csv_email(to_email, csv_bytes, filename):
    """Send an email with CSV attachment."""
    encoded_csv = base64.b64encode(csv_bytes).decode()
    attachment = Attachment(
        FileContent(encoded_csv),
        FileName(filename),
        FileType("text/csv"),
        Disposition("attachment"),
    )
    msg = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="Your Treatment History Export",
        plain_text_content="Attached is your treatment history CSV.",
    )
    msg.attachment = attachment
    sg.send(msg)
