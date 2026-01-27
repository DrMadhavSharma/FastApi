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
        "sender": {"email": "madhavsharma8194@gmail.com"},  # MUST be verified in Brevo
        "subject": subject,
    }

    # Content handling
    if content == "html":
        email_data["htmlContent"] = message
    else:
        email_data["textContent"] = message

    # Attachment handling
    if attachment_file:
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
        print(f"[FAIL] Email to {to_address} failed: {e}")
        return False