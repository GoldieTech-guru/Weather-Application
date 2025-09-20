# app.py
import os, json, logging
from datetime import datetime
import pytz
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
import requests
import certifi
from sib_api_v3_sdk.rest import ApiException
from sib_api_v3_sdk import ApiClient, TransactionalEmailsApi, SendSmtpEmail
from twilio.rest import Client as TwilioClient
from apscheduler.schedulers.background import BackgroundScheduler

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.getenv("SECRET_KEY", "dev")

# Load config and validate
OWM_KEY = os.getenv("OPENWEATHER_API_KEY")
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_FROM")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "group14@gmail.com")  # Default to Gmail via Brevo
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "contact@example.com")

# Set CA bundle for SSL verification
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()
logger.debug(f"Using CA bundle: {certifi.where()}")

# Validate and initialize clients
if not all([TWILIO_SID, TWILIO_AUTH, TWILIO_FROM]) and any([TWILIO_SID, TWILIO_AUTH, TWILIO_FROM]):
    logger.error("Twilio configuration is incomplete. All of TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM are required.")
TWILIO = TwilioClient(TWILIO_SID, TWILIO_AUTH) if all([TWILIO_SID, TWILIO_AUTH, TWILIO_FROM]) else None
if not BREVO_API_KEY:
    logger.error("Brevo API key is missing.")
# Initialize Brevo with custom SSL context
if BREVO_API_KEY:
    client = ApiClient()
    client.configuration.api_key['api-key'] = BREVO_API_KEY
    client.configuration.ssl_ca_cert = certifi.where()  # type: ignore
    transactional_api = TransactionalEmailsApi(client)
else:
    transactional_api = None

SUBSCRIBERS_PATH = "data/subscribers.json"

def save_subscriber(data):
    try:
        if os.path.exists(SUBSCRIBERS_PATH):
            with open(SUBSCRIBERS_PATH, "r") as f:
                subscribers = json.load(f)
        else:
            subscribers = []
        subscribers.append(data)
        with open(SUBSCRIBERS_PATH, "w") as f:
            json.dump(subscribers, f, indent=2)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Failed to save subscriber: {e}")
        return {"ok": False, "error": str(e)}

def send_sms(phone, message):
    if not TWILIO:
        return {"ok": False, "error": "Twilio not configured"}
    try:
        TWILIO.messages.create(
            body=message,
            from_=TWILIO_FROM,
            to=phone
        )
        return {"ok": True}
    except Exception as e:
        logger.error(f"SMS sending failed: {e}")
        return {"ok": False, "error": str(e)}

def send_email(to_email, subject, html_content):
    if not transactional_api:
        return {"ok": False, "error": "Brevo not configured"}
    try:
        send_email_request = SendSmtpEmail(
            to=[{"email": to_email, "name": "Subscriber"}],
            sender={"email": FROM_EMAIL, "name": "Weather Notifier"},
            subject=subject,
            html_content=html_content
        )
        transactional_api.send_transac_email(send_email_request)
        return {"ok": True}
    except ApiException as e:
        logger.error(f"Email sending failed: {e}")
        return {"ok": False, "error": str(e)}

def get_weather(lat, lon):
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OWM_KEY}&units=metric"
    try:
        response = requests.get(url, verify=certifi.where())
        data = response.json()
        if data["cod"] != 200:
            return {"error": data.get("message", "Weather data unavailable")}
        return {
            "city": data["name"],
            "condition_main": data["weather"][0]["main"],
            "condition_desc": data["weather"][0]["description"],
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "wind_speed": data["wind"]["speed"],
            "icon": data["weather"][0]["icon"]
        }
    except Exception as e:
        logger.error(f"Weather fetch failed: {e}")
        return {"error": str(e)}

def geocode(query):
    try:
        geocode_url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=1&appid={OWM_KEY}"
        response = requests.get(geocode_url, verify=certifi.where())
        data = response.json()
        if not data or 'lat' not in data[0]:
            return {"error": "Geocoding failed"}
        return {"lat": data[0]["lat"], "lon": data[0]["lon"]}
    except Exception as e:
        logger.error(f"Geocode failed: {e}")
        return {"error": str(e)}

def reverse_geocode(lat, lon):
    try:
        reverse_url = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={OWM_KEY}"
        response = requests.get(reverse_url, verify=certifi.where())
        data = response.json()
        if not data:
            return {"error": "Reverse geocoding failed"}
        return {
            "lat": lat,
            "lon": lon,
            "city": data[0].get("name"),
            "country": data[0].get("country"),
            "country_code": data[0].get("country"),
            "address": {"state": data[0].get("state")}
        }
    except Exception as e:
        logger.error(f"Reverse geocode failed: {e}")
        return {"error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/weather_by_coords', methods=['POST'])
def weather_by_coords():
    data = request.get_json(force=True)
    lat = data.get('lat')
    lon = data.get('lon')
    if not all([lat, lon]):
        return jsonify({"error": "Latitude and longitude are required"}), 400
    weather = get_weather(lat, lon)
    if "error" in weather:
        return jsonify(weather), 500
    return jsonify(weather)

@app.route('/geocode', methods=['POST'])
def geocode_route():
    data = request.get_json(force=True)
    query = data.get('query')
    if not query:
        return jsonify({"error": "Query is required"}), 400
    result = geocode(query)
    return jsonify(result)

@app.route('/reverse_geocode', methods=['POST'])
def reverse_geocode_route():
    data = request.get_json(force=True)
    lat = data.get('lat')
    lon = data.get('lon')
    if not all([lat, lon]):
        return jsonify({"error": "Latitude and longitude are required"}), 400
    result = reverse_geocode(lat, lon)
    return jsonify(result)

@app.route("/subscribe", methods=["POST"])
def subscribe():
    form = request.get_json(force=True)
    method = form.get("method", "email").lower()  # Default to "email" (Gmail)
    phone = form.get("phone")
    email = form.get("email")
    also_email = form.get("also_email", False)
    alt_email = form.get("alt_email")
    city = form.get("city")
    country = form.get("country")
    lat = form.get("lat")
    lon = form.get("lon")
    if not email:  # Email is required as default
        return jsonify({"ok": False, "error": "Email is required."}), 400
    if method == "sms" and not phone:
        return jsonify({"ok": False, "error": "Phone number required for SMS."}), 400
    payload = {
        "method": method,
        "phone": phone,
        "email": email,
        "also_email": bool(also_email),
        "alt_email": alt_email,
        "city": city,
        "country": country,
        "lat": lat,
        "lon": lon,
        "ts": datetime.now(pytz.utc).isoformat() + "Z",
    }
    save_result = save_subscriber(payload)
    if "error" in save_result:
        return jsonify(save_result), 500
    msg = f"Weather alerts enabled for {city or 'your location'} (lat={lat}, lon={lon}). You will receive updates via {method.upper()}."
    results = {}
    if method in ["sms", "both"] and phone:
        results["sms"] = send_sms(phone, msg)
    if method in ["email", "both"] or also_email and email:
        results["email"] = send_email(email, "Weather Alerts Confirmed", msg)
    if also_email and alt_email:
        results["also_email"] = send_email(alt_email, "Weather Alerts Also Enabled", msg)
    return jsonify({"ok": True, "message": "Subscription successful", "results": results}), 200

@app.route("/health")
def health():
    return {"status": "ok"}

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.start()

# Shutdown scheduler on app exit
import atexit
atexit.register(lambda: scheduler.shutdown())

if __name__ == "__main__":
    app.run(debug=True)
