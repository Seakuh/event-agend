import requests
from anthropic import Anthropic

client = Anthropic(api_key="CLAUDE_API_KEY")

events = requests.get("EVENT_API_URL").json()

prompt = f"""
Filtere diese Events nach meinen Interessen:
- elektronische Musik
- Kunst & Technologie
- kleine Events

Events:
{events}
"""

response = client.messages.create(
    model="claude-3-sonnet",
    max_tokens=500,
    messages=[{"role": "user", "content": prompt}]
)

print(response.content[0].text)
