<!-- Normal business edit (name only)
Before: PASS
After: PASS
Change: none
Business edit with Access Token
Before: PASS (plain save)
After: PASS only if WHATSAPP_TOKEN_ENC_KEY set
Without key: FAIL (blocked intentionally)
Real Meta webhook message
Before: PASS
After: PASS (if signature valid)
Fake webhook message (manual POST)
Before: PASS (security gap)
After: FAIL (correctly blocked)
Get business list in UI
Before: PASS (but leaked raw tokens)
After: PASS (tokens masked)
Business admin own business data
Before: PASS
After: PASS
Business admin other business data
Before: sometimes weak/confusing
After: FAIL with clean 403 (correct security)
Send message when business creds missing
Before: PASS via global fallback (unsafe)
After: FAIL safely (unless dev fallback explicitly enabled)
So: valid use-cases still pass; unsafe/misuse paths now fail by design.





8:36 PM
Real Meta webhook message
Before: PASS
After: PASS (if signature valid)
signatu whe writ check core?

exp?
8:38 PM



Worked for 1m 52s
Yes, correct.

For a real Meta webhook message:

Before security update: it was accepted without signature verification.
After security update: it is accepted only if signature is valid.
Where signature is checked:

In webhook route file: webhook.ts\whatsapp-bot\server\src\routes\webhook.ts)
What is checked:

Header: X-Hub-Signature-256
Hash format: sha256=...
Server recomputes HMAC using your WHATSAPP_APP_SECRET and compares.
Result:

Match => request continues (PASS)
Mismatch/missing (when secret is configured) => rejected (403) -->