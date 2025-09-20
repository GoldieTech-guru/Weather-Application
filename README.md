Weather Notifier
Overview
Weather Notifier is a comprehensive Flask-based web application designed to deliver real-time weather updates and subscription-based alerts via SMS or email. Leveraging APIs from OpenWeatherMap for weather data, Nominatim for location services, Twilio for SMS, and SendGrid for emails, this app provides an interactive user experience with a map interface for location selection.
The application allows users to:

View current weather conditions by clicking on a map or searching locations.
Subscribe to weather alerts for specific locations.
Receive notifications tailored to their preferences.

This project is ideal for developers interested in API integrations, web development, and notification systems. It demonstrates best practices in handling environment variables, error management, and user interactions.
Key Features

Interactive Map Interface: Powered by HTML/JavaScript (assuming integration with libraries like Leaflet or Google Maps in the frontend, though not explicitly coded in provided files).
Real-Time Weather Fetching: Uses OpenWeatherMap to retrieve temperature, humidity, wind speed, and conditions.
Geocoding Services: Forward and reverse geocoding via Nominatim to convert addresses to coordinates and vice versa.
Subscription System: Users can subscribe via SMS or email; data stored in a JSON file for persistence.
Notification Delivery: Sends confirmation messages and alerts using Twilio (SMS) and SendGrid (email).
Weather Condition Tips: Displays informational sections on common weather types with dressing and safety advice.
Health Endpoint: Simple /health route for monitoring application status.
Modular Design: Helper functions for weather retrieval, notifications, and data saving promote code reusability.
Error Handling: Robust checks for API keys, request validations, and fallback messages.

Technologies Used

Backend: Python with Flask framework.
APIs:
OpenWeatherMap for weather data.
Nominatim (OpenStreetMap) for geocoding.
Twilio for SMS.
SendGrid for email.


Frontend: HTML templates with embedded CSS and JavaScript for UI interactions.
Data Storage: JSON file for subscriber persistence (simple, file-based database).
Environment Management: dotenv for loading configuration from .env.

Prerequisites
Before setting up the application, ensure you have:

Python 3.8+ installed.
API keys and accounts for:
OpenWeatherMap (free tier available).
Twilio (requires account SID, auth token, and a phone number).
SendGrid (API key for email sending).


A valid email address for Nominatim's User-Agent header (to comply with usage policies).
Optional: Browser with JavaScript enabled for the interactive map.

Installation Guide

Clone the Repository:
git clone https://github.com/yourusername/weather-notifier.git
cd weather-notifier


Create a Virtual Environment:
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate


Install Dependencies:Use the provided requirements.txt to install packages:
pip install -r requirements.txt


Configure Environment Variables:Create a .env file in the root directory with the following content (replace placeholders with your actual values):
SENDGRID_API_KEY=your_sendgrid_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM=+your_twilio_phone_number
USER_PHONE_NUMBER=+your_personal_phone_for_alerts
LOCATION=your_default_location  # e.g., Abuja
FROM_EMAIL=your_from_email@example.com
CONTACT_EMAIL=your_contact_email@example.com


Set Up Data Directory:Create a data folder to store subscriber information:
mkdir data

The app will automatically create subscribers.json if it doesn't exist.

Run the Application:
python app.py

Access the app at http://localhost:5000 in your web browser.


Usage Instructions
Web Interface

Homepage: Features a map, search bar, and subscription form.
Location Selection:
Click on the map to pin a location.
Use "Search on Map" to find places by name.
"Use My Location" leverages browser geolocation.


Fetch Weather: Click "Get Weather" to display current conditions (temperature, humidity, etc.).
Subscribe:
Select SMS or Email.
Provide contact details.
Optionally add an alternative email.
Submit to receive a confirmation notification.


Weather Types Section: Informational cards on conditions like Clear, Clouds, Rain, and Thunderstorm with tips.

API Endpoints
The app exposes several RESTful endpoints:

GET /: Renders the index page.
POST /weather_by_coords:
Body: {"lat": float, "lon": float}
Returns: Weather data JSON.


POST /geocode:
Body: {"query": "city name"}
Returns: Coordinates and address.


POST /reverse_geocode:
Body: {"lat": float, "lon": float}
Returns: Address details.


POST /subscribe:
Body: Subscription details (method, phone/email, location).
Returns: Success status and notification results.


GET /health: Returns {"status": "ok"}.

Configuration Details

API Keys: Mandatory for weather and notifications; app gracefully handles missing keys with errors.
Nominatim Usage: Includes a User-Agent with contact email to adhere to fair usage policies. Avoid high-volume requests.
Subscriber Storage: JSON file for simplicity; consider migrating to a database like SQLite for production.
Units: Weather data in metric (Celsius, m/s wind).

Development and Customization

Extending Functionality: Add cron jobs for periodic alerts using libraries like APScheduler.
Frontend Enhancements: Integrate a mapping library (e.g., Leaflet) in index.html for better visuals.
Security: In production, use HTTPS, validate inputs more rigorously, and secure .env.
Testing: Write unit tests for helpers using pytest; mock API responses.
Deployment: Host on Heroku, Vercel, or AWS; ensure environment variables are set in the hosting platform.

Troubleshooting

API Errors: Check console logs for status codes; verify keys in .env.
Notification Failures: Ensure Twilio/SendGrid accounts are funded and numbers/emails are verified.
Geocoding Issues: Nominatim may rate-limit; use sparingly or cache results.
Map Not Loading: Ensure JavaScript is enabled; add map scripts if missing.
Dependency Conflicts: Use the exact versions in requirements.txt or update cautiously.

Contributing
We welcome contributions! Fork the repo, create a branch, and submit a pull request. Focus on:

Bug fixes.
New features (e.g., forecast integration).
Documentation improvements.

Please adhere to PEP8 coding standards and include tests for changes.
License
This project is open-source under the MIT License. Feel free to use, modify, and distribute.
Acknowledgments

Thanks to OpenWeatherMap, OpenStreetMap, Twilio, and SendGrid for their APIs.
Built with Flask and Python for simplicity and power.

For questions, contact the maintainer at [CONTACT_EMAIL].