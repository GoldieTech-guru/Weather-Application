(async function(){
  // Fetch location data
  let locationData = [];
  try {
    const res = await fetch('/static/cities.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const cities = await res.json();
    // Transform flat cities array into nested structure
    locationData = [];
    const countryMap = new Map();
    cities.forEach(city => {
      const countryName = city.country_name;
      const stateName = city.state_name;
      if (!countryMap.has(countryName)) {
        countryMap.set(countryName, new Map());
      }
      const stateMap = countryMap.get(countryName);
      if (!stateMap.has(stateName)) {
        stateMap.set(stateName, []);
      }
      stateMap.get(stateName).push({
        name: city.name
      });
    });
    // Convert to array of countries with states and cities
    countryMap.forEach((states, countryName) => {
      const country = {
        iso2: countryName.replace(/\s+/g, '_'),
        name: countryName,
        states: []
      };
      states.forEach((cities, stateName) => {
        country.states.push({
          state_code: stateName.replace(/\s+/g, '_'),
          name: stateName,
          cities: cities
        });
      });
      locationData.push(country);
    });
  } catch (e) {
    console.error('Failed to load location data', e);
    alert('Unable to load cities data. Some features may not work.');
  }

  // Elements
  const countrySelect = document.getElementById('countrySelect');
  const stateSelect = document.getElementById('stateSelect');
  const citySelect = document.getElementById('citySelect');
  const selectedLocation = document.getElementById('selectedLocation');
  const weatherBox = document.getElementById('weatherBox');
  const bgVideo = document.getElementById('bgVideo');
  const bgVideoSource = document.getElementById('bgVideoSource');
  const bgImg = document.getElementById('bgImg');

  // Subscribe form
  const form = document.getElementById('subscribeForm');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const methodSelect = document.getElementById('method');
  const alsoEmail = document.getElementById('alsoEmail');
  const subscribeMsg = document.getElementById('subscribeMsg');

  // Modal
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  // Map setup (Leaflet)
  const map = L.map('map').setView([9.0820, 8.6753], 6); // Center of Nigeria
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;
  let selected = { lat: null, lon: null, city: null, state: null, country: null };

  function setMarker(lat, lon){
    if (marker) marker.setLatLng([lat, lon]);
    else marker = L.marker([lat, lon]).addTo(map);
    map.panTo([lat, lon]);
  }

  async function reverseGeocode(lat, lon){
    try{
      const res = await fetch('/reverse_geocode', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ lat, lon })
      });
      const data = await res.json();
      if(data.error){ console.warn(data.error); return; }
      selected.lat = parseFloat(data.lat);
      selected.lon = parseFloat(data.lon);
      selected.city = data.city;
      selected.country = data.country;
      selectedLocation.textContent = `Selected Location: ${data.city || ''}, ${data.country || ''} (Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)})`;
      // Try to update dropdowns based on reverse geocode
      countrySelect.value = data.country_code ? data.country_code.replace(/\s+/g, '_') : '';
      if (countrySelect.value) populateStates(countrySelect.value);
      stateSelect.value = data.address.state ? data.address.state.replace(/\s+/g, '_') : '';
      if (stateSelect.value) populateCities(stateSelect.value);
      citySelect.value = data.city || '';
    }catch(e){
      console.error('reverse geocode failed', e);
    }
  }

  async function geocodeCity(city, state, country) {
    try {
      const query = `${city}, ${state}, ${country}`;
      const res = await fetch('/geocode', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.error) {
        console.warn(data.error);
        return null;
      }
      return {
        lat: parseFloat(data.lat),
        lon: parseFloat(data.lon)
      };
    } catch (e) {
      console.error('Geocode failed', e);
      return null;
    }
  }

  map.on('click', function(e){
    const lat = e.latlng.lat, lon = e.latlng.lng;
    setMarker(lat, lon);
    reverseGeocode(lat, lon);
  });

  // Populate countries
  locationData.forEach(country => {
    const option = document.createElement('option');
    option.value = country.iso2;
    option.textContent = country.name;
    countrySelect.appendChild(option);
  });

  // On country change
  countrySelect.addEventListener('change', (e) => {
    const iso2 = e.target.value;
    stateSelect.disabled = !iso2;
    citySelect.disabled = true;
    stateSelect.innerHTML = '<option value="">Select State</option>';
    citySelect.innerHTML = '<option value="">Select City</option>';
    if (iso2) {
      populateStates(iso2);
    }
  });

  function populateStates(iso2) {
    const country = locationData.find(c => c.iso2 === iso2);
    if (country && country.states) {
      country.states.forEach(state => {
        const option = document.createElement('option');
        option.value = state.state_code;
        option.textContent = state.name;
        stateSelect.appendChild(option);
      });
    }
  }

  // On state change
  stateSelect.addEventListener('change', (e) => {
    const stateCode = e.target.value;
    citySelect.disabled = !stateCode;
    citySelect.innerHTML = '<option value="">Select City</option>';
    if (stateCode) {
      populateCities(stateCode);
    }
  });

  function populateCities(stateCode) {
    const countryIso = countrySelect.value;
    const country = locationData.find(c => c.iso2 === countryIso);
    if (country && country.states) {
      const state = country.states.find(s => s.state_code === stateCode);
      if (state && state.cities) {
        state.cities.forEach(city => {
          const option = document.createElement('option');
          option.value = city.name;
          option.textContent = city.name;
          citySelect.appendChild(option);
        });
      }
    }
  }

  // On city change
  citySelect.addEventListener('change', async (e) => {
    const option = e.target.options[e.target.selectedIndex];
    if (option.value) {
      selected.city = option.value;
      selected.state = stateSelect.options[stateSelect.selectedIndex].textContent;
      selected.country = countrySelect.options[countrySelect.selectedIndex].textContent;
      selectedLocation.textContent = `Selected Location: ${selected.city}, ${selected.state}, ${selected.country} (Fetching coordinates...)`;
      
      // Fetch coordinates via geocode endpoint
      const coords = await geocodeCity(selected.city, selected.state, selected.country);
      if (coords && coords.lat && coords.lon) {
        selected.lat = coords.lat;
        selected.lon = coords.lon;
        selectedLocation.textContent = `Selected Location: ${selected.city}, ${selected.state}, ${selected.country} (Lat: ${coords.lat.toFixed(4)}, Lon: ${coords.lon.toFixed(4)})`;
        setMarker(coords.lat, coords.lon);
        map.setView([coords.lat, coords.lon], 12);
      } else {
        selected.lat = null;
        selected.lon = null;
        selectedLocation.textContent = `Selected Location: ${selected.city}, ${selected.state}, ${selected.country} (Coordinates unavailable)`;
        if (marker) {
          map.removeLayer(marker);
          marker = null;
        }
        map.setView([9.0820, 8.6753], 6); // Reset to default view
        alert('Unable to fetch coordinates for this city. Weather data may be limited.');
      }
    }
  });

  // Use browser location
  document.getElementById('useMyLocation').addEventListener('click', ()=>{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        setMarker(lat, lon);
        map.setView([lat, lon], 12);
        reverseGeocode(lat, lon);
      }, err=>{ alert('Could not get location: ' + err.message); });
    } else alert('Geolocation not supported.');
  });

  // Get Weather
  document.getElementById('getWeather').addEventListener('click', async ()=>{
    const lat = selected.lat, lon = selected.lon;
    if(!lat || !lon){ alert('Select a location with valid coordinates first.'); return; }
    weatherBox.innerHTML = 'Loading...'; weatherBox.classList.remove('hidden');
    try{
      const res = await fetch('/weather_by_coords', {
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lat, lon })
      });
      const data = await res.json();
      if(data.error){ weatherBox.innerHTML = `<p style="color:#fca5a5">${data.error}</p>`; return; }
      const html = `
        <h3>${data.city || 'Location'}</h3>
        <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.condition_main}">
        <p><strong>${data.condition_main || ''}</strong> — ${data.condition_desc || ''}</p>
        <p>Temperature: ${data.temp ?? '-'}°C (feels ${data.feels_like ?? '-'}°C)</p>
        <p>Humidity: ${data.humidity ?? '-'}% • Wind: ${data.wind_speed ?? '-'} m/s</p>
      `;
      weatherBox.innerHTML = html;
      setBackground(data.condition_main);
    }catch(e){
      weatherBox.innerHTML = `<p style="color:#fca5a5">Failed: ${e}</p>`;
    }
  });

  // Background switching
  function setBackground(kind){
    const key = (kind || 'default').toLowerCase();
    const imgUrl = {
      'clear': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1350&q=80',
      'clouds': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1350&q=80',
      'rain': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1350&q=80',
      'thunderstorm': 'https://images.unsplash.com/photo-1533957293890-129e4a3e1f7e?auto=format&fit=crop&w=1350&q=80',
      'default': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1350&q=80'
    }[key] || 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1350&q=80';
    bgImg.src = imgUrl;
    bgImg.classList.remove('hidden');
    bgVideo.classList.add('hidden');
  }

  // Subscribe form logic
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    subscribeMsg.textContent = '';
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const method = methodSelect.value;
    if (!email) {
      subscribeMsg.textContent = 'Please provide an email.';
      return;
    }
    let payload = {
      method: method,
      phone: phone || null,
      email: email,
      also_email: (method === 'sms' && alsoEmail.checked && email) || false,
      alt_email: (method === 'sms' && alsoEmail.checked && email) ? email : null,
      city: selected.city || null,
      country: selected.country || null,
      lat: selected.lat,
      lon: selected.lon
    };
    try {
      const res = await fetch('/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(err => {
        console.error('Failed to parse response:', err);
        return { ok: false, error: 'Invalid server response' };
      });
      if (!data.ok) {
        subscribeMsg.textContent = data.error || 'Failed to subscribe.';
        return;
      }
      subscribeMsg.textContent = data.message || 'Subscribed! Check your phone/email.';
      if (data.results) {
        if (data.results.sms && !data.results.sms.ok) console.error('SMS failed:', data.results.sms.error);
        if (data.results.email && !data.results.email.ok) console.error('Email failed:', data.results.email.error);
      }
    } catch (err) {
      subscribeMsg.textContent = `Network error: ${err.message || err}`;
    }
  });

  // Modal logic
  function openModal(title, bodyHtml){ modalTitle.textContent = title; modalBody.innerHTML = bodyHtml; modal.classList.remove('hidden'); }
  function closeModal(){ modal.classList.add('hidden'); }
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

  document.querySelectorAll('.tip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      const type = btn.dataset.type;
      if(type === 'about') openModal(`${kind} — About & Dress Tips`, window.TIPS.renderAbout(kind));
      else openModal(`${kind} — Safety Tips`, window.TIPS.renderSafety(kind));
    });
  });
})();