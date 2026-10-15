// Spoken prompts via the device's speech voices. Voice quality varies a lot by
// device, so rank what's installed: Premium/Enhanced first, then British/Aussie
// accents (warmer for kids), and skip the novelty and robotic voices outright.

const FLAGS = { AU: '🇦🇺', GB: '🇬🇧', IE: '🇮🇪', NZ: '🇳🇿', ZA: '🇿🇦', IN: '🇮🇳', US: '🇺🇸', CA: '🇨🇦' }

// macOS/iOS joke voices + the old "Eloquence" ones; all sound wrong for kids
const SKIP = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Fred|Good News|Jester|Junior|Kathy|Organ|Superstar|Ralph|Trinoids|Whisper|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/

// Default pick (user, 2026-10-14): a British male voice. Google's on Chrome,
// Apple's Daniel/Arthur on iPad and Mac.
const PREFERRED = /^(Google UK English Male|Daniel|Arthur)\b/

// Known pleasant voices (Apple + Google) get a nudge up
const NICE = /^(Karen|Catherine|Lee|Serena|Kate|Martha|Stephanie|Daniel|Arthur|Moira|Tessa|Samantha|Ava|Google UK English Female|Google UK English Male)\b/

function region(v) {
  return (v.lang || '').replace('_', '-').split('-')[1]?.toUpperCase() ?? ''
}

function score(v) {
  let s = 0
  if (PREFERRED.test(v.name) && region(v) === 'GB') s += 60
  if (v.name === 'Google UK English Male') s += 10   // the one the user picked by ear
  if (/premium/i.test(v.name)) s += 40
  else if (/enhanced/i.test(v.name)) s += 25
  if (['AU', 'GB', 'IE', 'NZ'].includes(region(v))) s += 30
  if (NICE.test(v.name)) s += 15
  if (v.localService) s += 5   // network voices can lag behind the tap
  return s
}

export function englishVoices() {
  const all = window.speechSynthesis?.getVoices?.() ?? []
  return all
    .filter(v => /^en/i.test(v.lang) && !SKIP.test(v.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
}

export function findVoice(name) {
  const list = englishVoices()
  return (name && list.find(v => v.name === name)) || list[0] || null
}

export const flagFor = v => FLAGS[region(v)] ?? '🗣️'

// Short display name: "Karen (Enhanced)" → "Karen ✨"
export function voiceLabel(v) {
  const base = v.name.replace(/\s*\((premium|enhanced)\)/i, '').replace(/^Google\s+/, '')
  return /premium|enhanced/i.test(v.name) ? `${base} ✨` : base
}

// Chrome only starts loading voices on the first getVoices() call and returns []
// until 'voiceschanged' fires. Speaking in that window uses the browser's default
// voice, so prompts came out in two different voices. Load them up front, and
// hold an early prompt until they arrive.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
let pending = null, pendingTimer = null

function flushPending() {
  if (!pending || !englishVoices().length) return
  const { text, voiceName } = pending
  pending = null
  clearTimeout(pendingTimer)
  say(text, voiceName)
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', flushPending)
}

export function speak(text, voiceName) {
  if (!window.speechSynthesis) return
  // iOS only lets speech start inside the tap, so never defer there (its voices are ready at once anyway)
  if (!englishVoices().length && !isIOS) {
    pending = { text, voiceName }
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => {   // voices never came: better the default voice than silence
      const p = pending
      pending = null
      if (p) say(p.text, p.voiceName)
    }, 2000)
    return
  }
  say(text, voiceName)
}

function say(text, voiceName) {
  const synth = window.speechSynthesis
  try {   // speech is a nice-to-have; it must never break the tap that triggered it
    const u = new SpeechSynthesisUtterance(text)
    const v = findVoice(voiceName)
    if (v) { u.voice = v; u.lang = v.lang }
    u.rate = 1.0
    u.pitch = 1.1   // a touch bright; much higher makes these voices sound tinny
    synth.cancel()
    synth.speak(u)
  } catch {}
}

// Voices arrive asynchronously in Chrome/Safari; call back when they're ready.
export function onVoicesReady(cb) {
  const synth = window.speechSynthesis
  if (!synth) return () => {}
  cb()
  synth.addEventListener?.('voiceschanged', cb)
  return () => synth.removeEventListener?.('voiceschanged', cb)
}
