import base64
import json
import os
import re
import sys
import urllib.request
import urllib.error

TOKEN = os.environ.get("HOSTINGER_API_TOKEN") or ""
VM_ID = int(os.environ.get("HOSTINGER_VM_ID", "1399420"))
BASE = f"https://developers.hostinger.com/api/vps/v1/virtual-machines/{VM_ID}"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


def read_env_value(key, envfile, default=None):
    try:
        with open(envfile, "r", encoding="utf-8") as f:
            for line in f:
                m = re.match(rf"^\s*{re.escape(key)}\s*=\s*(.*)$", line)
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    except FileNotFoundError:
        if default is not None:
            return default
        raise
    if default is not None:
        return default
    raise KeyError(f"{key} not found in {envfile}")


def call(method, path, payload=None):
    url = BASE + path if path.startswith("/") else f"https://developers.hostinger.com/api/vps/v1/{path}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) curl/8.5.0")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main():
    envfile = os.path.join(REPO, ".env")
    # Load HOSTINGER_API_TOKEN from .env if not already in os.environ.
    global TOKEN, VM_ID
    if not TOKEN:
        TOKEN = read_env_value("HOSTINGER_API_TOKEN", envfile)
    try:
        VM_ID = int(read_env_value("HOSTINGER_VM_ID", envfile, default=str(VM_ID)))
    except (KeyError, ValueError):
        pass
    if not TOKEN:
        print("error: HOSTINGER_API_TOKEN missing from .env or env vars", file=sys.stderr)
        sys.exit(2)

    compose_path = os.path.join(HERE, "paperclip-compose.yml")
    with open(compose_path, "r", encoding="utf-8") as f:
        content = f.read()

    ollama_key = read_env_value("OLLAMA_API_KEY", envfile)

    env_lines = [
        f"OLLAMA_API_KEY={ollama_key}",
    ]
    env_text = "\n".join(env_lines) + "\n"

    payload = {
        "project_name": "paperclip-stack",
        "content": content,
        "environment": env_text,
    }

    print(f"content: {len(content)} bytes | env: {len(env_text)} bytes")
    status, body = call("POST", "/docker", payload)
    print(f"HTTP {status}\n{body[:800]}\n")
    if status >= 400:
        sys.exit(1)


if __name__ == "__main__":
    main()
