
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const dashboard = document.getElementById("dashboard");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const suggestions = document.getElementById("suggestions");
const unitBtn = document.getElementById("unitBtn");

let weatherData = null;
let selectedLocation = null;
let isFahrenheit = false;
let searchTimer;

const weatherTypes = {
    0: ["Clear Sky", "☀️"],
    1: ["Mainly Clear", "🌤️"],
    2: ["Partly Cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Rime Fog", "🌫️"],
    51: ["Light Drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy Drizzle", "🌧️"],
    61: ["Light Rain", "🌧️"],
    63: ["Moderate Rain", "🌧️"],
    65: ["Heavy Rain", "⛈️"],
    71: ["Light Snow", "🌨️"],
    73: ["Snow", "❄️"],
    75: ["Heavy Snow", "❄️"],
    77: ["Snow Grains", "❄️"],
    80: ["Rain Showers", "🌦️"],
    81: ["Heavy Showers", "🌧️"],
    82: ["Violent Showers", "⛈️"],
    85: ["Snow Showers", "🌨️"],
    86: ["Heavy Snow Showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with Hail", "⛈️"],
    99: ["Severe Thunderstorm", "⛈️"]
};

function getWeather(code) {
    return weatherTypes[code] || ["Unknown Conditions", "🌍"];
}

function convertTemp(temp) {
    return isFahrenheit ? (temp * 9 / 5) + 32 : temp;
}

function formatTemp(temp) {
    return Math.round(convertTemp(temp)) + "°";
}

function formatDate(date) {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short"
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// CITY SEARCH

async function searchCities(query) {
    if (query.trim().length < 2) {
        suggestions.innerHTML = "";
        return;
    }

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        suggestions.innerHTML = "";

        (data.results || []).forEach(city => {
            const button = document.createElement("button");
            button.className = "suggestion-item";

            button.textContent = `${city.name}, ${city.admin1 || city.country || ""} ${city.country || ""}`;

            button.addEventListener("click", () => {
                suggestions.innerHTML = "";
                cityInput.value = city.name;
                getWeatherData(city);
            });

            suggestions.appendChild(button);
        });

    } catch (error) {
        suggestions.innerHTML = "";
    }
}

cityInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchCities(cityInput.value);
    }, 350);
});

// GET WEATHER DATA

async function getWeatherData(city) {
    selectedLocation = city;

    loading.classList.remove("hidden");
    dashboard.classList.add("hidden");
    errorBox.classList.add("hidden");
    suggestions.innerHTML = "";

    try {
        const { latitude, longitude } = city;

        const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;

        const airURL = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,european_aqi,pm2_5,pm10&timezone=auto`;

        const [weatherResponse, airResponse] = await Promise.all([
            fetch(weatherURL),
            fetch(airURL)
        ]);

        if (!weatherResponse.ok) {
            throw new Error("Unable to retrieve weather information.");
        }

        const data = await weatherResponse.json();

        let airData = null;

        if (airResponse.ok) {
            airData = await airResponse.json();
        }

        weatherData = {
            weather: data,
            air: airData
        };

        renderWeather();

        dashboard.classList.remove("hidden");

    } catch (error) {
        errorBox.textContent = error.message || "Something went wrong. Please try again.";
        errorBox.classList.remove("hidden");
    } finally {
        loading.classList.add("hidden");
    }
}

// DISPLAY WEATHER

function renderWeather() {
    if (!weatherData) return;

    const data = weatherData.weather;
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const [condition, icon] = getWeather(current.weather_code);

    document.getElementById("location").textContent =
        `${selectedLocation.name}, ${selectedLocation.country || ""}`;

    document.getElementById("localTime").textContent =
        `Local time: ${formatTime(current.time)} · ${data.timezone}`;

    document.getElementById("weatherIcon").textContent = icon;

    document.getElementById("temperature").textContent =
        Math.round(convertTemp(current.temperature_2m));

    document.getElementById("degree").textContent =
        isFahrenheit ? "°F" : "°C";

    document.getElementById("condition").textContent = condition;

    document.getElementById("feels").textContent =
        Math.round(convertTemp(current.apparent_temperature));

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("wind").textContent =
        current.wind_speed_10m + " km/h";

    document.getElementById("pressure").textContent =
        current.surface_pressure;

    document.getElementById("rain").textContent =
        current.precipitation;

    document.getElementById("uv").textContent =
        daily.uv_index_max[0];

    document.getElementById("sunrise").textContent =
        formatTime(daily.sunrise[0]);

    document.getElementById("sunset").textContent =
        formatTime(daily.sunset[0]);

    displayAirQuality();
    displayAnalysis();
    displayHourly();
    displayForecast();
    displayInsights();
}

// AIR QUALITY

function displayAirQuality() {
    const air = weatherData.air?.current;

    if (!air || air.us_aqi == null) {
        document.getElementById("aqi").textContent = "N/A";
        document.getElementById("aqiLabel").textContent = "Data unavailable";
        return;
    }

    const aqi = air.us_aqi;

    let label = "Good";

    if (aqi > 50) label = "Moderate";
    if (aqi > 100) label = "Unhealthy for sensitive groups";
    if (aqi > 150) label = "Unhealthy";
    if (aqi > 200) label = "Very unhealthy";
    if (aqi > 300) label = "Hazardous";

    document.getElementById("aqi").textContent = aqi;
    document.getElementById("aqiLabel").textContent = label;
}

// INTELLIGENT WEATHER ANALYSIS

function displayAnalysis() {
    const current = weatherData.weather.current;

    const temp = current.temperature_2m;
    const humidity = current.relative_humidity_2m;
    const wind = current.wind_speed_10m;
    const rain = current.precipitation;
    const code = current.weather_code;
    const aqi = weatherData.air?.current?.us_aqi;

    let overview = "Comfortable Conditions";
    let analysis = "Weather conditions appear relatively stable.";

    if (temp >= 35) {
        overview = "Extreme Heat Conditions";
        analysis = "High temperatures detected. Stay hydrated, avoid prolonged direct sunlight and seek shade.";
    } else if (temp >= 30) {
        overview = "Hot Weather Detected";
        analysis = "It is quite warm outside. Carry water and consider lighter clothing.";
    } else if (temp <= 10) {
        overview = "Cold Weather Conditions";
        analysis = "Temperatures are low. Wear warm clothing when going outdoors.";
    } else if (temp >= 20 && temp <= 28 && humidity < 65) {
        overview = "Ideal Outdoor Conditions";
        analysis = "Temperature and humidity are relatively comfortable. A good time for outdoor activities.";
    } else if (humidity > 80) {
        overview = "High Humidity Detected";
        analysis = "The atmosphere is humid. It may feel warmer than the actual temperature.";
    }

    if (wind >= 40) {
        overview = "Strong Winds Detected";
        analysis += " Strong winds may affect outdoor activities.";
    }

    if (rain > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
        overview = "Wet Weather Conditions";
        analysis = "Rain or storm conditions are detected. Consider carrying an umbrella and check local weather alerts.";
    }

    if (aqi != null && aqi > 100) {
        analysis += " Air quality is poor, so sensitive individuals should limit prolonged outdoor exertion.";
    }

    document.getElementById("overview").textContent = overview;
    document.getElementById("analysis").textContent = analysis;
}

// HOURLY FORECAST

function displayHourly() {
    const hourly = weatherData.weather.hourly;
    const currentTime = weatherData.weather.current.time;

    let startIndex = hourly.time.findIndex(time => time >= currentTime);

    if (startIndex < 0) startIndex = 0;

    const container = document.getElementById("hourly");
    container.innerHTML = "";

    for (let i = startIndex; i < Math.min(startIndex + 24, hourly.time.length); i += 3) {
        const [condition, icon] = getWeather(hourly.weather_code[i]);

        const card = document.createElement("div");
        card.className = "hour-card";

        card.innerHTML = `
            <p>${formatTime(hourly.time[i])}</p>
            <span>${icon}</span>
            <h3>${formatTemp(hourly.temperature_2m[i])}</h3>
            <small>${hourly.precipitation_probability[i] ?? 0}% rain</small>
        `;

        container.appendChild(card);
    }
}

// 7 DAY FORECAST

function displayForecast() {
    const daily = weatherData.weather.daily;
    const container = document.getElementById("forecast");

    container.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const [condition, icon] = getWeather(daily.weather_code[i]);

        const card = document.createElement("div");
        card.className = "day-card";

        card.innerHTML = `
            <p>${i === 0 ? "Today" : formatDate(daily.time[i])}</p>
            <span>${icon}</span>
            <h3>${formatTemp(daily.temperature_2m_max[i])}</h3>
            <small>${formatTemp(daily.temperature_2m_min[i])}</small>
        `;

        container.appendChild(card);
    }
}

// ADDITIONAL INSIGHTS

function displayInsights() {
    const current = weatherData.weather.current;
    const aqi = weatherData.air?.current?.us_aqi;

    const code = current.weather_code;
    const temp = current.temperature_2m;
    const wind = current.wind_speed_10m;

    let outdoor = "Good";
    let alert = "No major indicator";

    if (temp > 35 || temp < 5 || wind > 40 || current.precipitation > 0) {
        outdoor = "Not Recommended";
    } else if (temp >= 30 || wind > 25) {
        outdoor = "Use Caution";
    }

    if ([95, 96, 99].includes(code)) {
        alert = "Thunderstorm";
    } else if (temp >= 40) {
        alert = "Extreme Heat";
    } else if (wind >= 50) {
        alert = "Strong Winds";
    } else if (aqi != null && aqi > 150) {
        alert = "Poor Air Quality";
    } else if ([65, 82, 86].includes(code)) {
        alert = "Severe Weather";
    }

    document.getElementById("outdoor").textContent = outdoor;
    document.getElementById("alert").textContent = alert;
}

// SEARCH BUTTON

async function searchWeather() {
    const cityName = cityInput.value.trim();

    if (!cityName) {
        errorBox.textContent = "Please enter a city or location.";
        errorBox.classList.remove("hidden");
        return;
    }

    loading.classList.remove("hidden");
    errorBox.classList.add("hidden");
    dashboard.classList.add("hidden");
    suggestions.innerHTML = "";

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error("Location not found. Try another city.");
        }

        await getWeatherData(data.results[0]);

    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("hidden");
        loading.classList.add("hidden");
    }
}

searchBtn.addEventListener("click", searchWeather);

cityInput.addEventListener("keydown", event => {
    if (event.key === "Enter") searchWeather();
});

// POPULAR CITIES

document.querySelectorAll(".city-btn").forEach(button => {
    button.addEventListener("click", () => {
        cityInput.value = button.dataset.city;
        searchWeather();
    });
});

// CELSIUS / FAHRENHEIT

unitBtn.addEventListener("click", () => {
    isFahrenheit = !isFahrenheit;
    unitBtn.textContent = isFahrenheit ? "°F / °C" : "°C / °F";

    if (weatherData) {
        renderWeather();
    }
});

// LOAD INITIAL LOCATION

async function loadDefaultCity() {
    cityInput.value = "Chennai";

    const defaultCity = {
        name: "Chennai",
        country: "India",
        latitude: 13.0827,
        longitude: 80.2707
    };

    await getWeatherData(defaultCity);
}

loadDefaultCity();
