import requests
import json
from urllib.parse import quote

# 1. Configuration (Use the data you provided)
DECK_ID = "cmiwp5nmv6idr05eb8a09qm0d"
API_ENDPOINT = "https://curiosa.io/api/trpc/deck.getDecklistById"

# 2. Construct the URL
input_payload = json.dumps({"0": {"json": {"id": DECK_ID}}})
encoded_input = quote(input_payload)

api_url = (
    f"{API_ENDPOINT}?batch=1&input={encoded_input}"
)

# 3. Enhanced Headers (The Fix for the Forbidden Error)
headers = {
    # Mimic a standard browser:
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    # CRITICAL FIX: Tell the server the request originates from its own site
    "Referer": "https://curiosa.io/",
    "Origin": "https://curiosa.io"
}

print(f"Testing API with Deck ID: {DECK_ID}")
print("-" * 40)

# 4. Execute Request
try:
    response = requests.get(api_url, headers=headers, timeout=10)
    response.raise_for_status() # Raises HTTPError if status is 4xx or 5xx

    raw_response = response.json()
    
    # 5. Output Success Data
    decklist_data = raw_response[0]['result']['data']['json']['decklist']
    
    print("SUCCESS! API request returned data.")
    print(f"Decklist contains {len(decklist_data)} unique cards.")
    print("Example Card from Decklist:")
    # Print the first item in the decklist for structure confirmation
    print(json.dumps(decklist_data[0], indent=2))

except requests.exceptions.RequestException as e:
    print(f"ERROR: Request failed or returned a bad status code.")
    print(f"Status: {response.status_code if 'response' in locals() else 'N/A'}")
    print(f"Detail: {e}")
    # Print content if possible to see the specific server error
    if 'response' in locals() and response.text:
         print("Server Response Preview:")
         print(response.text[:200])
except Exception as e:
    print(f"ERROR during parsing: {e}")