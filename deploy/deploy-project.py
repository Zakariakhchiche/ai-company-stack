"""Generic Hostinger VPS docker-compose deployer.

Usage:
    python deploy/deploy-project.py <project_name> <compose_file> [KEY=value ...]

Examples:
    python deploy/deploy-project.py files-viewer deploy/files-viewer-compose.yml
    python deploy/deploy-project.py backup-daily  deploy/backup-compose.yml
    python deploy/deploy-project.py paperclip-stack deploy/paperclip-compose.yml OLLAMA_API_KEY=xxx
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error


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


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)

    project_name = sys.argv[1]
    compose_path = sys.argv[2]
    extra_env_pairs = sys.argv[3:]

    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    envfile = os.path.join(repo, ".env")

    token = os.environ.get("HOSTINGER_API_TOKEN") or read_env_value("HOSTINGER_API_TOKEN", envfile)
    vm_id = int(os.environ.get("HOSTINGER_VM_ID") or read_env_value("HOSTINGER_VM_ID", envfile, "1399420"))

    with open(compose_path, "r", encoding="utf-8") as f:
        content = f.read()

    env_lines = list(extra_env_pairs)
    env_text = ("\n".join(env_lines) + "\n") if env_lines else "# (no env)\n"

    payload = {
        "project_name": project_name,
        "content": content,
        "environment": env_text,
    }

    url = f"https://developers.hostinger.com/api/vps/v1/virtual-machines/{vm_id}/docker"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) curl/8.5.0")

    print(f"deploying project '{project_name}' from {compose_path} ({len(content)} bytes) to VM {vm_id}")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            print(f"HTTP {r.status}")
            print(r.read().decode()[:1200])
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}")
        print(e.read().decode()[:1200])
        sys.exit(1)


if __name__ == "__main__":
    main()
