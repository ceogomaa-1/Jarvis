import { NextResponse } from 'next/server'
import type { WeatherData } from '@/types'

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY
  const city = process.env.NEXT_PUBLIC_WEATHER_CITY || 'Cairo'

  if (!apiKey) {
    // Mock data when no API key
    const mock: WeatherData = {
      city,
      temp: 28,
      feels_like: 30,
      description: 'Clear skies',
      icon: '01d',
      humidity: 35,
      wind_speed: 12,
    }
    return NextResponse.json(mock)
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } } // 30 min cache
    )

    if (!res.ok) throw new Error(`Weather API error: ${res.status}`)

    const data = await res.json()
    const weather: WeatherData = {
      city: data.name,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    }

    return NextResponse.json(weather)
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({
      city,
      temp: 28,
      feels_like: 30,
      description: 'Clear skies',
      icon: '01d',
      humidity: 35,
      wind_speed: 12,
    } as WeatherData)
  }
}
