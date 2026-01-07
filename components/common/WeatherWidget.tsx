
import React, { useState, useEffect } from 'react';

const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<{ temp: number; code: number; isDay: number; wind: number } | null>(null);
    const [location, setLocation] = useState('Accra, Ghana');
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
            // Using Open-Meteo which is very reliable and has no API key requirements
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, {
                signal: AbortSignal.timeout(5000) // 5s timeout
            });
            
            if (!res.ok) throw new Error("Weather service unreachable");
            
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
            console.warn("Weather fetch failed:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Robust geocoding using Open-Meteo's own search API (more reliable than Nominatim for CORS)
    const initLocationDetection = () => {
        if (!navigator.geolocation) {
            fetchWeather(5.6037, -0.1870, 'Accra, Ghana');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                // Defaulting name to coordinates if reverse geocode fails or is skipped for stability
                fetchWeather(latitude, longitude, `Your Location (${latitude.toFixed(1)}, ${longitude.toFixed(1)})`);
            },
            (err) => {
                console.warn("Geolocation skipped:", err.message);
                fetchWeather(5.6037, -0.1870, 'Accra, Ghana');
            },
            { enableHighAccuracy: false, timeout: 3000, maximumAge: 3600000 }
        );
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(false);
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
            if (!geoRes.ok) throw new Error("Geocoding service unreachable");
            
            const geoData = await geoRes.json();

            if (geoData.results && geoData.results.length > 0) {
                const { latitude, longitude, name, country } = geoData.results[0];
                const displayName = `${name}${country ? `, ${country}` : ''}`;
                await fetchWeather(latitude, longitude, displayName);
            } else {
                setError(true);
                setLoading(false);
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            setError(true);
            setLoading(false);
        }
    };

    useEffect(() => {
        initLocationDetection();
    }, []);

    const info = weather ? getWeatherInfo(weather.code, weather.isDay) : { icon: '...', label: 'Offline' };

    return (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl border border-white/5 relative overflow-hidden group transition-all">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
            
            <div className="relative z-10">
                {isEditing ? (
                    <form onSubmit={handleSearch} className="flex flex-col gap-2">
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter city name..." 
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold py-1 transition-colors">
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} className="bg-slate-700 hover:bg-slate-600 text-white rounded px-3 text-xs font-bold transition-colors">
                                ✕
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsEditing(true)} title="Click to search location">
                        <div className="flex-grow min-w-0 pr-4">
                            <div className="flex items-center gap-1 mb-1">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">{location}</h4>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-500 opacity-50 flex-shrink-0"><path d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 57 57 0 0 0 4.157.648l1.721 1.721a.75.75 0 0 0 1.06 0l1.72-1.72c2.9-.1 5.68-.42 8.134-1.156a.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Z" /></svg>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl filter drop-shadow-md">{info.icon}</span>
                                <div>
                                    <p className="text-2xl font-black leading-none">{loading ? '--' : Math.round(weather?.temp || 0)}°C</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{info.label}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right border-l border-white/5 pl-4">
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Wind</p>
                             <p className="text-sm font-black text-blue-400">{loading ? '-' : weather ? Math.round(weather.wind || 0) : 0} <span className="text-[10px] opacity-70">km/h</span></p>
                        </div>
                    </div>
                )}
                {error && !isEditing && (
                    <button onClick={initLocationDetection} className="mt-2 text-[9px] text-red-400 font-bold uppercase hover:underline">
                        ⚠️ Feed error. Tap to retry.
                    </button>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
