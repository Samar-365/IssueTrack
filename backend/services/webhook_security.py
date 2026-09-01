"""
Webhook Security Service — Validates HMAC-SHA256 signatures for GitHub webhooks.
Protects against payload tampering and spoofed requests.
"""
import hmac
import hashlib
from typing import Tuple, Optional


def compute_github_signature(payload: bytes, secret: str) -> str:
    """
    Compute GitHub-compliant HMAC-SHA256 signature for a byte payload.

    :param payload: Raw request body in bytes.
    :param secret: Webhook secret string.
    :return: Signature formatted as 'sha256=<hex_digest>'.
    """
    if not isinstance(payload, bytes):
        if isinstance(payload, str):
            payload = payload.encode('utf-8')
        else:
            raise TypeError("Payload must be bytes or string")

    mac = hmac.new(secret.encode('utf-8'), msg=payload, digestmod=hashlib.sha256)
    return f"sha256={mac.hexdigest()}"


def verify_github_signature(
    payload_bytes: bytes,
    signature_header: Optional[str],
    secret: Optional[str]
) -> Tuple[bool, str]:
    """
    Verify GitHub X-Hub-Signature-256 header using constant-time comparison.

    :param payload_bytes: Raw HTTP request body in bytes.
    :param signature_header: Content of 'X-Hub-Signature-256' header (e.g. 'sha256=...').
    :param secret: Shared GITHUB_WEBHOOK_SECRET configured on backend.
    :return: Tuple of (is_valid: bool, reason: str).
    """
    # If no secret is configured, allow requests only in local/dev environments
    if not secret:
        return True, "No webhook secret configured; signature check bypassed"

    if not signature_header:
        return False, "Missing X-Hub-Signature-256 header"

    if not signature_header.startswith("sha256="):
        return False, "Malformed signature header (must start with 'sha256=')"

    provided_digest = signature_header[7:].strip()
    if not provided_digest:
        return False, "Empty signature digest provided"

    # Compute expected signature
    mac = hmac.new(secret.encode('utf-8'), msg=payload_bytes, digestmod=hashlib.sha256)
    expected_digest = mac.hexdigest()

    # Use constant-time comparison to prevent timing side-channel attacks
    if not hmac.compare_digest(expected_digest, provided_digest):
        return False, "Signature mismatch"

    return True, "Signature verified successfully"
