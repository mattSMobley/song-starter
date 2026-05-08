# iOS Audio Fix Attempts

## What we know
- App loads past splash screen (context starts, `setStarted(true)` runs) ✓
- Melodies generate and display ✓  
- No sound when tapping piano keys or melody play buttons ✗

## Attempts (oldest → newest)

### 1. Resume before playing if suspended (56fc175)
Checked `Tone.context.state` before each note; if suspended, called `Tone.start()` then played.
**Result: no fix** — iOS has extra states like `'interrupted'` that this didn't catch.

### 2. Always resume in gesture + silent buffer unlock (4a29769)
- `Piano.activate`: unconditionally calls `Tone.start()` synchronously in touch handler, plays note in `.then()`
- `startAudio()`: plays a 1-sample silent AudioBufferSource to fully unlock iOS audio session
**Result: no fix**

### 3. Parallel reverb send (97ebd58)
`Tone.Reverb` uses `OfflineAudioContext` internally. If it fails on iOS, its `ConvolverNode` gets a null buffer → spec says outputs silence. Changed reverb from inline effect to parallel send, so `delay → masterOut` path exists regardless.
**Result: no fix** — addresses null buffer symptom, but if OfflineAudioContext suspends the *main* context, parallel send still doesn't help.

### 4. Remove Tone.Chorus (ae56cb7)
`Tone.Chorus` uses `ChannelSplitterNode` / `ChannelMergerNode` internally — known to silently fail on iOS Safari, blocking the entire limiter→delay chain.
**Result: no fix by itself** (but was a real issue — probably needed alongside others)

### 5. Skip Tone.Reverb entirely on iOS + post-init resume check (current)
- Detect iOS (`/iPad|iPhone|iPod/` + iPadOS-on-Mac check)
- `initAudioGraph()`: skip `new Tone.Reverb()` on iOS entirely (no OfflineAudioContext created at all, including drum reverb)
- `startAudio()`: after graph init, re-check `ctx.state` and call `ctx.resume()` if not running
- `Piano.activate`: `Tone.start()` fire-and-forget (sync, in gesture) then `noteOn` sync — no `.then()` delay
- Piano compact keys: 30→25 px wide, fits iPhone without scroll
**Theory**: OfflineAudioContext creation re-suspends main AudioContext on some iOS versions. Previous fix addressed null buffer; this prevents the OfflineAudioContext from existing at all.
**Result: untested**

## Ideas not yet tried
- Disable sampler loading on iOS (Piano → PolySynth only; sampler may silently fail to decode/play)
- Add AudioContext `statechange` listener to auto-resume on interruption
- Add explicit error logging to try-catches to surface silent failures
- Delay first note by 50ms after context start (OscillatorNode.start at t≈0 can be dropped by iOS)
