import { useEffect, useState } from 'react'
import { englishVoices, findVoice, flagFor, voiceLabel, speak, onVoicesReady } from './voice.js'

// Grown-up popover: turn the voice off, or tap a voice to hear it and pick it.
export default function VoicePicker({ voiceOn, voiceName, onChange, onClose }) {
  const [voices, setVoices] = useState([])
  useEffect(() => onVoicesReady(() => setVoices(englishVoices().slice(0, 10))), [])
  const current = voiceOn ? findVoice(voiceName)?.name : null

  function pick(v) {
    onChange({ voiceOn: true, voiceName: v.name })
    speak("Hi! Let's make some music!", v.name)
  }

  return (
    <div className="deck-scrim" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="voice-card">
        <button className="deck-close" aria-label="close" onClick={onClose}>✖</button>
        <button className={`voice-opt ${!voiceOn ? 'on' : ''}`}
          onClick={() => { window.speechSynthesis?.cancel(); onChange({ voiceOn: false, voiceName }) }}>
          <span className="voice-flag">🤫</span>
        </button>
        {voices.map(v => (
          <button key={v.name} className={`voice-opt ${current === v.name ? 'on' : ''}`} onClick={() => pick(v)}>
            <span className="voice-flag">{flagFor(v)}</span>
            <span className="voice-name">{voiceLabel(v)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
