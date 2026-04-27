"""One-off: gzip+base64 the plan markdown and deploy via Hostinger API env var."""
import base64
import gzip
import json
import os
import re
import sys
import urllib.request
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

def read_env(k):
    with open(os.path.join(REPO, ".env"), "r", encoding="utf-8") as f:
        for line in f:
            m = re.match(rf"^\s*{re.escape(k)}\s*=\s*(.*)$", line)
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise KeyError(k)

token = read_env("HOSTINGER_API_TOKEN")
vm = int(read_env("HOSTINGER_VM_ID"))

with open(os.path.join(HERE, "plan-action-compose.yml"), "r", encoding="utf-8") as f:
    compose = f.read()
with open(os.path.join(HERE, "fct-plan-action.md"), "rb") as f:
    raw = f.read()

gz = gzip.compress(raw, compresslevel=9)
plan_b64 = base64.b64encode(gz).decode("ascii")
env_text = f"PLAN_GZ_B64={plan_b64}\n"

print(f"raw={len(raw)}b gz={len(gz)}b b64={len(plan_b64)}c compose={len(compose)}c env={len(env_text)}c")

payload = {
    "project_name": "plan-action",
    "content": compose,
    "environment": env_text,
}

req = urllib.request.Request(
    f"https://developers.hostinger.com/api/vps/v1/virtual-machines/{vm}/docker",
    data=json.dumps(payload).encode(),
    method="POST",
)
req.add_header("Authorization", f"Bearer {token}")
req.add_header("Content-Type", "application/json")
req.add_header("Accept", "application/json")
req.add_header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) curl/8.5.0")

try:
    with urllib.request.urlopen(req, timeout=180) as r:
        print("HTTP", r.status)
        print(r.read().decode()[:600])
except urllib.error.HTTPError as e:
    print("HTTP", e.code)
    print(e.read().decode()[:600])
    sys.exit(1)
