
import React, { useState, useEffect } from 'react';

const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<{ temp: number; code: number; isDay: number; wind: number } | null>(null);
    const [location, setLocation] = useState('Accra'); // Default
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(false);

    // Weather Codes to Icons/Labels
    const getWeatherInfo = (code: number, isDay: number) => {
        if (code === 0) return { icon: isDay ? '☀️' : '🌙', label: 'Clear' };
        if (code >= 1 && code <= 3) return { icon: isDay ? '🌤️' : '☁️', label: 'Partly Cloudy' };
        if (code >= 45 && code <= 48) return { icon: '🌫️', label: 'Foggy' };
        if (code >= 51 && code <= 67) return { icon: '🌧️', label: 'Rainy' };
        if (code >= 71 && code <= 77) return { icon: '❄️', label: 'Snow' };
        if (code >= 80 && code <= 82) return { icon: '🌦️', label: 'Showers' };
        if (code >= 95) return { icon: '⚡', label: 'Thunderstorm' };
        return { icon: '🌡️', label: 'Unknown' };
    };

    const fetchWeather = async (lat: number, lon: number, name: string) => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();
            setWeather({
                temp: data.current_weather.temperature,
                code: data.current_weather.weathercode,
                isDay: data.current_weather.is_day,
                wind: data.current_weather.windspeed
            });
            setLocation(name);
            setIsEditing(false);
        } catch (err) {
            console.error("Weather fetch error", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        try {
            // Geocoding API
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();

            if (geoData.results && geoData.results.length > 0) {
                const { latitude, longitude, name, country } = geoData.results[0];
                const displayName = `${name}, ${country || ''}`;
                await fetchWeather(latitude, longitude, displayName);
            } else {
                setError(true); // Location not found
                setLoading(false);
            }
        } catch (err) {
            console.error("Geocoding error", err);
            setError(true);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load for Accra
        fetchWeather(5.6037, -0.1870, 'Accra, Ghana');
    }, []);

    const info = weather ? getWeatherInfo(weather.code, weather.isDay) : { icon: '...', label: 'Loading' };

    return (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg border border-blue-500/30 relative overflow-hidden group transition-all">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
            
            <div className="relative z-10">
                {isEditing ? (
                    <form onSubmit={handleSearch} className="flex flex-col gap-2">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter city name..." 
                            className="w-full bg-blue-900/50 border border-blue-400 rounded px-2 py-1 text-sm text-white placeholder-blue-300 outline-none focus:bg-blue-900"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-white/20 hover:bg-white/30 rounded text-xs font-bold py-1 transition-colors">
                                {loading ? '...' : 'Search'}
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded px-3 text-xs font-bold transition-colors">
                                ✕
                            </button>
                        </div>
                        {error && <p className="text-[10px] text-red-300">Location not found. Try again.</p>}
                    </form>
                ) : (
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsEditing(true)} title="Click to change location">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-200 truncate max-w-[120px]">{location}</h4>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-300 opacity-50 group-hover:opacity-100"><path d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 57 57 0 0 0 4.157.648l1.721 1.721a.75.75 0 0 0 1.06 0l1.72-1.72c2.9-.1 5.68-.42 8.134-1.156a.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Z" /></svg>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl filter drop-shadow-md">{info.icon}</span>
                                <div>
                                    <p className="text-2xl font-black leading-none">{loading ? '--' : Math.round(weather?.temp || 0)}°C</p>
                                    <p className="text-xs text-blue-100 font-medium">{info.label}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] text-blue-200">Wind</p>
                             <p className="text-xs font-bold">{loading ? '-' : weather ? Math.round(weather.wind || 0) : 0} km/h</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
