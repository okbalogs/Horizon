const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const geoBtn = document.getElementById('geo-btn');
const weatherDisplay = document.getElementById('weather-display');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('error-msg');
const weatherIcon = document.getElementById('weather-icon');

const elements = {
    city: document.getElementById('city-name'),
    date: document.getElementById('current-date'),
    temp: document.getElementById('current-temp'),
    desc: document.getElementById('weather-desc'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind-speed'),
    pressure: document.getElementById('pressure'),
    visibility: document.getElementById('visibility'),
    forecast: document.getElementById('forecast-container')
};

// Weather Code Mapping
function getWeatherDetails(code) {
    const mapping = {
        0: { desc: 'Clear sky', icon: '01d' },
        1: { desc: 'Mainly clear', icon: '02d' },
        2: { desc: 'Partly cloudy', icon: '02d' },
        3: { desc: 'Overcast', icon: '04d' },
        45: { desc: 'Fog', icon: '50d' },
        48: { desc: 'Depositing rime fog', icon: '50d' },
        51: { desc: 'Light drizzle', icon: '09d' },
        53: { desc: 'Moderate drizzle', icon: '09d' },
        55: { desc: 'Dense drizzle', icon: '09d' },
        61: { desc: 'Slight rain', icon: '10d' },
        63: { desc: 'Moderate rain', icon: '10d' },
        65: { desc: 'Heavy rain', icon: '10d' },
        71: { desc: 'Slight snow', icon: '13d' },
        73: { desc: 'Moderate snow', icon: '13d' },
        75: { desc: 'Heavy snow', icon: '13d' },
        77: { desc: 'Snow grains', icon: '13d' },
        80: { desc: 'Slight rain showers', icon: '09d' },
        81: { desc: 'Moderate rain showers', icon: '09d' },
        82: { desc: 'Violent rain showers', icon: '09d' },
        95: { desc: 'Thunderstorm', icon: '11d' },
        96: { desc: 'Thunderstorm with hail', icon: '11d' },
        99: { desc: 'Thunderstorm with heavy hail', icon: '11d' }
    };
    return mapping[code] || { desc: 'Unknown', icon: '50d' };
}

async function fetchCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error('City not found');
    return data.results[0];
}

async function fetchWeather(city) {
    showLoading();
    try {
        const coords = await fetchCoordinates(city);
        await fetchWeatherData(coords.latitude, coords.longitude, coords.name);
    } catch (err) {
        showError(err.message);
    }
}

async function fetchWeatherData(lat, lon, cityName) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=6`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather data unavailable');
        const data = await res.json();
        
        updateUI(data, cityName);
    } catch (err) {
        showError(err.message);
    }
}

function updateUI(data, cityName) {
    hideLoading();
    errorMsg.classList.add('hidden');
    weatherDisplay.classList.remove('hidden');

    const current = data.current;
    const daily = data.daily;
    const weatherInfo = getWeatherDetails(current.weather_code);

    elements.city.textContent = cityName;
    elements.date.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    elements.temp.textContent = `${Math.round(current.temperature_2m)}°`;
    elements.desc.textContent = weatherInfo.desc;
    
    // Icon
    const iconCode = weatherInfo.icon.replace('d', current.is_day ? 'd' : 'n');
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    weatherIcon.classList.remove('hidden');

    elements.humidity.textContent = `${current.relative_humidity_2m}%`;
    elements.wind.textContent = `${current.wind_speed_10m} km/h`;
    elements.pressure.textContent = `${current.surface_pressure} hPa`;
    // Open-Meteo doesn't provide visibility in the basic free set easily, so we hide it or set default
    elements.visibility.parentElement.classList.add('hidden'); 

    updateBackground(weatherInfo.desc);
    renderForecast(daily);
}

function updateBackground(condition) {
    document.body.className = '';
    const cond = condition.toLowerCase();
    if (cond.includes('cloud')) document.body.classList.add('cloudy');
    else if (cond.includes('rain') || cond.includes('drizzle')) document.body.classList.add('rainy');
    else if (cond.includes('clear')) document.body.classList.add('clear-day');
    else document.body.classList.add('clear-day');
}

function renderForecast(daily) {
    elements.forecast.innerHTML = '';
    
    // Skip today (index 0)
    for(let i = 1; i < daily.time.length; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const code = daily.weather_code[i];
        const info = getWeatherDetails(code);

        const item = document.createElement('div');
        item.className = 'forecast-item';
        // Average temp
        const temp = Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2);

        item.innerHTML = `
            <span class="day">${dayName}</span>
            <img src="https://openweathermap.org/img/wn/${info.icon}.png" alt="icon" style="width: 50px; height: 50px;">
            <span class="temp">${temp}°</span>
        `;
        elements.forecast.appendChild(item);
    }
}

function showLoading() {
    loading.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
    errorMsg.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    hideLoading();
    errorMsg.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
    const p = errorMsg.querySelector('p');
    if (p) p.textContent = message || 'Error fetching data';
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) fetchWeather(city);
    }
});

geoBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            fetchWeatherData(pos.coords.latitude, pos.coords.longitude, 'Your Location');
        }, () => {
            alert('Unable to retrieve your location');
        });
    }
});

fetchWeather('London');
