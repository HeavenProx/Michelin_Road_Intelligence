'use client'

import { useState, useEffect } from 'react'

const s = {
  container: { maxWidth: 900, margin: '0 auto', padding: '2rem' },
  header: { textAlign: 'center', borderBottom: '2px solid #e63312', paddingBottom: '1.5rem', marginBottom: '2rem' },
  h1: { fontSize: '2rem', color: '#e63312', margin: 0 },
  subtitle: { color: '#aaa', marginTop: '0.5rem' },
  authBar: (connected) => ({
    textAlign: 'center', padding: '0.75rem', background: '#2a2a2a',
    borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.9rem',
    borderLeft: `4px solid ${connected ? '#22c55e' : '#888'}`,
  }),
  buttons: { display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' },
  btn: (bg) => ({
    padding: '0.75rem 1.5rem', border: 'none', borderRadius: 8,
    fontSize: '1rem', cursor: 'pointer', fontWeight: 600, background: bg, color: 'white',
  }),
  output: { background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 12, padding: '1.5rem', minHeight: 200 },
  card: { background: '#333', borderRadius: 8, padding: '1rem', marginBottom: '1rem' },
  badge: { display: 'inline-block', background: '#e63312', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 20, fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' },
  explanation: { background: '#222', borderLeft: '3px solid #e63312', padding: '0.75rem 1rem', borderRadius: '0 6px 6px 0', color: '#ddd', lineHeight: 1.6, margin: '1rem 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.75rem' },
  profileItem: { background: '#333', borderRadius: 8, padding: '0.75rem' },
  label: { fontSize: '0.75rem', color: '#888', display: 'block' },
  value: { fontSize: '1.2rem', fontWeight: 'bold' },
  altCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2f2f2f', padding: '0.6rem 1rem', borderRadius: 6, marginBottom: '0.4rem', fontSize: '0.9rem' },
  bar: { height: 4, background: '#444', borderRadius: 2, marginTop: 2 },
  fill: (pct) => ({ height: '100%', width: `${pct}%`, background: '#e63312', borderRadius: 2 }),
  scoresGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.75rem' },
}

function ScoreBar({ value }) {
  return <div style={s.bar}><div style={s.fill(value / 5 * 100)} /></div>
}

export default function Home() {
  const [authStatus, setAuthStatus] = useState({ connected: false })
  const [output, setOutput]         = useState(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    // Vérification du retour OAuth
    const params = new URLSearchParams(window.location.search)
    const auth   = params.get('auth')
    if (auth) {
      window.history.replaceState({}, '', '/')
      if (auth === 'success') fetchRecommend()
      if (auth === 'denied' || auth === 'error') setOutput({ type: 'error', message: 'Connexion Strava échouée ou refusée.' })
    }
    checkAuth()
  }, [])

  async function checkAuth() {
    const r    = await fetch('/api/auth/status')
    const data = await r.json()
    setAuthStatus(data)
  }

  async function apiFetch(path, options = {}) {
    const r    = await fetch(path, options)
    const data = await r.json()
    if (!r.ok) throw new Error(data.message || 'Erreur serveur')
    return data
  }

  async function run(fn) {
    setLoading(true)
    try { await fn() }
    catch (e) { setOutput({ type: 'error', message: e.message }) }
    finally { setLoading(false) }
  }

  async function fetchProfile() {
    await run(async () => {
      const data = await apiFetch('/api/profile')
      setOutput({ type: 'profile', data })
    })
  }

  async function fetchRecommend() {
    await run(async () => {
      const data = await apiFetch('/api/recommend')
      setOutput({ type: 'recommend', data })
      checkAuth()
    })
  }

  async function fetchDemo() {
    await run(async () => {
      const data = await apiFetch('/api/demo')
      setOutput({ type: 'recommend', data, demo: true })
    })
  }

  async function logout() {
    await fetch('/api/auth/logout')
    setAuthStatus({ connected: false })
    setOutput(null)
  }

  function renderOutput() {
    if (!output) return <p style={{ color: '#888', fontStyle: 'italic' }}>Cliquez sur un bouton pour commencer...</p>
    if (loading)  return <p style={{ color: '#aaa', fontStyle: 'italic' }}>⏳ Chargement...</p>

    if (output.type === 'error') return <p style={{ color: '#f87171' }}>❌ {output.message}</p>

    if (output.type === 'profile') {
      const { athlete, profile: p } = output.data
      return (
        <>
          <h2 style={{ color: '#e63312', marginBottom: '1rem' }}>📊 Profil de {athlete?.firstname}</h2>
          <div style={s.grid}>
            {[
              ['Sorties analysées', p.ride_count],
              ['Distance totale',   `${p.total_distance_km} km`],
              ['Km/mois',           `${p.monthly_distance} km`],
              ['Vitesse moyenne',   `${p.avg_speed_kmh} km/h`],
              ['D+ moyen/sortie',   `${p.avg_elevation_m} m`],
              ['Terrain',           p.terrain_label],
              ['Style',             p.style_label],
              ['Sorties sous pluie',`${p.weather_exposure.rain_percentage}%`],
              ['Région',            p.region],
            ].map(([label, val]) => (
              <div key={label} style={s.profileItem}>
                <span style={s.label}>{label}</span>
                <span style={s.value}>{val}</span>
              </div>
            ))}
          </div>
        </>
      )
    }

    if (output.type === 'recommend') {
      const { recommended: t, alternatives, explanation, athlete, demo } = output.data
      return (
        <>
          {demo && <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>🎭 MODE DÉMO — Données fictives d'Alex Dupont</p>}
          <h2 style={{ color: '#e63312', marginBottom: '1rem' }}>🏆 Recommandation pour {athlete?.firstname}</h2>
          <div style={s.explanation}>{explanation}</div>
          <div style={s.card}>
            <span style={s.badge}>{t.match_score}% de compatibilité</span>
            <h3 style={{ color: '#e63312', margin: '0 0 0.5rem' }}>{t.name}</h3>
            <p style={{ color: '#bbb', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t.description}</p>
            <p style={{ fontSize: '0.85rem', color: '#888' }}>Durée de vie : ~{t.lifetime_km.toLocaleString()} km | Prix : {t.price_range}</p>
            <div style={s.scoresGrid}>
              {[['Adhérence pluie', t.scores.wet_grip], ['Résistance roulement', t.scores.rolling_resistance], ['Durabilité', t.scores.durability], ['Polyvalence', t.scores.terrain_versatility]].map(([label, val]) => (
                <div key={label} style={{ fontSize: '0.85rem', color: '#ccc' }}>
                  {label} <ScoreBar value={val} />
                </div>
              ))}
            </div>
          </div>
          <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Alternatives</p>
          {alternatives.map(a => (
            <div key={a.id} style={s.altCard}>
              <span>{a.name}</span>
              <span style={{ color: '#e63312', fontWeight: 'bold' }}>{a.match_score}%</span>
            </div>
          ))}
        </>
      )
    }
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <h1 style={s.h1}>🚴 Michelin Road Intelligence</h1>
        <p style={s.subtitle}>Recommandation de pneu vélo personnalisée — propulsé par Strava + Open-Meteo</p>
      </header>

      <div style={s.authBar(authStatus.connected)}>
        {authStatus.connected
          ? `✅ Connecté : ${authStatus.athlete.firstname} ${authStatus.athlete.lastname} (${authStatus.athlete.city || authStatus.athlete.country})`
          : '⚪ Non connecté à Strava'}
      </div>

      <div style={s.buttons}>
        <a href="/api/auth/strava"><button style={s.btn('#FC4C02')}>🔗 Connecter Strava</button></a>
        <button style={s.btn('#3b82f6')} onClick={fetchProfile}>📊 Mon profil</button>
        <button style={s.btn('#e63312')} onClick={fetchRecommend}>🏆 Ma recommandation</button>
        <button style={s.btn('#6b7280')} onClick={fetchDemo}>🎭 Démo sans Strava</button>
        {authStatus.connected && <button style={s.btn('#374151')} onClick={logout}>🚪 Déconnexion</button>}
      </div>

      <div style={s.output}>
        {loading
          ? <p style={{ color: '#aaa', fontStyle: 'italic' }}>⏳ Chargement...</p>
          : renderOutput()
        }
      </div>
    </div>
  )
}
