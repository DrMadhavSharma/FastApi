import os

import base64

import sib_api_v3_sdk

from sib_api_v3_sdk.rest import ApiException

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
def send_email(to_address, subject, message, content="html", attachment_file=None):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email_data = {
        "to": [{"email": to_address}],
        "sender": {"email": "madhavsharma8194@gmail.com"},  # must be verified
        "subject": subject,
    }
    print("Sending email to:", to_address)
    print("Attachment:", attachment_file)
    # Content
    if content == "html":
        email_data["htmlContent"] = message
    else:
        email_data["textContent"] = message

    # 🔒 ATTACHMENT GUARD (THIS IS THE KEY PART)
    if attachment_file:
        if not os.path.exists(attachment_file):
            raise Exception(f"Attachment file not found: {attachment_file}")

        with open(attachment_file, "rb") as f:
            encoded_file = base64.b64encode(f.read()).decode()

        email_data["attachment"] = [{
            "content": encoded_file,
            "name": os.path.basename(attachment_file)
        }]

    try:
        api_instance.send_transac_email(email_data)
        print(f"[OK] Email sent to {to_address}")
        return True

    except ApiException as e:
        print("Brevo status:", e.status)
        print("Brevo reason:", e.reason)
        print("Brevo body:", e.body)
        raise


