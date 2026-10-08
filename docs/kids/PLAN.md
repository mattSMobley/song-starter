# Song Starter Kids — Plan v2

A music-making mode for kids who can't read yet and don't know theory, but do
know **colors, small numbers, letters and sounds**. Primary target: **iPad**.

---

## 1. Principles (every decision gets checked against these)

1. **Nothing sounds wrong.** Everything is locked to key and tempo. "Different" is allowed, "bad" isn't.
2. **Sound → light → touch.** Every sound has a visible source that lights up when it plays.
3. **Color is never alone.** Every color is paired with a shape or icon (colorblind kids, ~1 in 12 boys).
4. **No reading required.** Icons, color, number of dots, motion, and optional spoken prompts.
5. **One color system per job.** Letter colors and vibe colors never live on the same widget.
6. **The next step glows.** The UI suggests what to do next and never blocks.
7. **Grow with the kid.** Age unlocks controls; nothing is ever taken away mid-song.

---

## 2. Research basis (to verify before shipping)

| Source | Idea | How we use it |
|---|---|---|
| Boomwhackers / Chroma-Notes school standard | C red, D orange, E yellow, F green, G teal, A purple, B pink | **Letter colors** (key tiles, chord numbers later) match what kids see at school |
| Figurenotes (Finland) | Color = note name, shape = octave | Pair every color with a shape; octave = ✕ low / ■ mid / ● high |
| Palmer et al. 2013, *PNAS* | Across cultures: fast/major → bright, warm, saturated; slow/minor → dark, cool | **Vibe colors** (warm = energetic, cool = calm); minor mode dims and cools the whole UI |
| Scriabin's *clavier à lumières* | Color-wheel distance stands in for musical distance | Same / neighbor / complement / clash rules on the vibe wheel |
| Kodály, Montessori bells | "Home" note, matching sounds | Chord 1 = 🏠; the song always returns home |

---

## 3. Two color systems

**A — Letter colors (fixed):** round, flat chips with the letter on them. Kid mode uses only the 7 natural keys (no sharps).

| C | D | E | F | G | A | B |
|---|---|---|---|---|---|---|
| red | orange | yellow | green | teal | purple | pink |

**B — Vibe colors (6-hue wheel):** glowing gems, each with its own shape.

| # | Hue | Shape | Vibe | Default tempo |
|---|---|---|---|---|
| 0 | 🔴 Red | ▲ | Stompy / rock | 128 |
| 1 | 🟠 Orange | ◆ | Bouncy / funk | 108 |
| 2 | 🟡 Yellow | ★ | Sunny / pop | 118 |
| 3 | 🟢 Green | ● | Chill / reggae–folk | 92 |
| 4 | 🔵 Blue | ☾ | Dreamy / lullaby | 76 |
| 5 | 🟣 Purple | ✦ | Spooky / space | 96 |

**Relationship to the leader (slot 1, wears a 👑)** is measured as wheel distance:

| Distance | Name | Musical meaning | Dial marker |
|---|---|---|---|
| 0 | Twin | Same genre, small variation | 👯 |
| 1 | Cousin | Neighboring genre, compatible feel | 🤝 |
| 2 | Clash | Genre mash-up, surprising, still in key and tempo | ⚡ |
| 3 | Complement | **Plays in the leader's gaps** (rhythmic interlock / call-and-response) | 🧩 |

The complement is generated from the leader's rhythm, so it always locks in.
If the leader is removed, the crown hops to the next slot.

---

## 4. Age tiers

On first launch: "How old are you?" with big number balloons (3 4 5 6 7 8 9+).
Tapping one pops that many balloons with that many notes, so kids count along.
Stored locally only. A grown-up can change it behind the parent gate.

| Tier | Ages | Slots | Bank | Song bar | Slot options |
|---|---|---|---|---|---|
| 🌱 Seedling | 3–4 | 3 | 8 instruments | ☀️/🌙 flip only | mute, remove |
| 🌿 Sprout | 5–6 | 4 | 12 | + key tiles, + 🐢/🐇 tempo | + loud/quiet |
| 🌳 Bloom | 7+ | 6 | all | + 3/4 ↔ 4/4 rocker, + 🎲 surprise | + low/mid/high octave |
| (next phase) | 7+ | | | + chord train (number blocks 1–6) | |

Tiers are data (`ageTiers.js`), so tuning them is a one-line change.

---

## 5. Interaction spec

**Instrument bank** (horizontal scroller at the bottom)
- Tap → the instrument goes to the first empty slot, plays a short "hello" phrase, and music auto-starts (instant payoff).
- If a slot is **selected**, tapping the bank **swaps** that slot's instrument and keeps its vibe.
- If all slots are full and none is selected, the slots wiggle with a soft "boop" and nothing is lost.

**Slots**
- Each slot shows the instrument icon, its vibe dial, and **lights up on every note it plays** (the main sound→source lesson).
- Tap a slot → selected (lifted, outlined) → options tray: 😴 mute, 🗑 remove (+ volume / octave by tier).
- Tap a selected slot again → deselect.

**Vibe dial** (one per slot)
- Six gems around the rim. **Tap a gem** to jump to it, **tap the center** to step forward, or **drag** to rotate. A 3-year-old can't do circular drags, so tapping always works.
- Each detent: click sound + gem pulse. The music changes within ~150 ms, in time with the beat.
- Dials on non-leader slots show the leader's color as a lit notch plus a relationship marker on each gem.

**Song bar**
- ☀️/🌙 big flip switch: parallel major/minor, same tonic. The whole UI warms/cools.
- Key tiles C–B: letter-colored bell bars.
- 🐢 —— 🐇 lever: tempo. The leader's vibe sets a default; the lever overrides it.
- 💃 3 / 🚶 4 rocker: small, in a corner. Takes effect at the next bar line.

**Glow guidance** (state machine, suggests and never blocks)
`no slots` → bank glows → `slot added, dial untouched` → that dial glows → `≥1 dial turned` → next empty slot + bank glow softly → after ~20 s idle, a song-bar control winks.

**Spoken prompts** (optional, parent toggle): "Pick an instrument!", "Turn the dial!", "Happy… or sad?" Phase 0 uses `speechSynthesis`; later, a recorded friendly voice.

---

## 6. Sound

**Phase 0** uses CDN samples (MusyngKite soundfont + Salamander + the local drum kits).
**Phase 1** self-hosts and curates everything (offline, no CDN dependency, App Store-safe).

Kid roster: Piano, Xylophone, Marimba, Glockenspiel, Music Box, Kalimba, Steel Drum,
Acoustic Guitar, Banjo, Bass, Drums, Violin, Pizzicato, Trumpet, Flute, Choir "ooh".
Later: ukulele, claps, shakers (need new sources).

**Roles:** every instrument has a role that decides its patterns.
`beat` (drums) · `bass` · `comp` (strum/chords) · `melody` · `sparkle` (high bell figures) · `pad` (long notes).
Two instruments with the same role → the second plays the alternate variant, an octave up.

**Mix:** per-slot channel (volume, mute) → shared bus → one reverb (ConvolverNode with
a generated impulse, **not** Tone.Reverb, which re-suspends iOS audio) → limiter at −3 dB.
Kids will max everything, so the limiter is mandatory.

**Licenses to verify before the App Store:** Salamander (CC-BY), MusyngKite (CC-BY-SA), nbrosowsky (CC-BY), VSCO2 CE (CC0).

---

## 7. Music engine

- **Scheduler:** the same raw-AudioContext lookahead scheduler pattern as `SessionTab` (150 ms lookahead, 20 ms ticks). No Tone.Transport.
- **Patterns are abstract:** steps hold chord-tone or scale-degree references, not note names. Key, mode and chord are resolved **at schedule time**, so every song-level flip lands on the next 16th note.
- **Meter:** each pattern has a 4/4 (16-step) and a 3/4 (12-step) version, **hand-written** (auto-conversion sounds bad). A meter change waits for the next bar line.
- **Progression:** one chord per bar from the leader's vibe, as diatonic degrees (e.g. 1-5-6-4), so it works in major *and* minor.
- **Register:** the key offset wraps to −5…+6 semitones so F–B go down. Instruments stay in their sweet spot in every key.
- **Visual sync:** note events fire DOM pulses via refs at audio time, not React state per note (iPad perf).

---

## 8. iPad app

- **Kids mode lives in the same codebase:** `src/kids/` is a separate component tree. The main splash gets a "Kids" button; `?kids` opens it directly.
- **iPad app = Capacitor wrapper** around the Vite build (more mature on iOS than Tauri mobile). An app build flag launches straight into kids mode; grown-up mode sits behind the parent gate.
- **iOS gotchas:**
  - The silent switch mutes Web Audio → `navigator.audioSession.type = 'playback'` (Safari 17+), plus a native `AVAudioSession .playback` in the Capacitor shell.
  - Reuse the keepalive `<audio>` trick from `engine.js`.
  - Memory: decoded samples are big (~10 MB per 30 s of stereo). Budget ≤150 MB, lazy-load per slot, release removed instruments, keep mono/trimmed samples.
  - Touch: `touch-action: manipulation`, no hover states, no long-press callouts, landscape first, ≥64 pt targets for Seedling.
  - Multi-touch: two siblings poking at once → pointer capture per control.
- **Apple Kids Category:** no third-party analytics or ads, a parental gate for external links and settings, local-only data (easy privacy story).

---

## 9. Saving

- Song = `{ key, mode, meter, bpm, slots:[{ inst, vibe, vol, oct, muted }] }`. Tiny JSON in IndexedDB via `idb`.
- **Name = 3 emoji stickers** (🦊🌈🚀) the kid taps; a parent can add text.
- Shelf of colored **cassette tapes**: color = key color, label = stickers.
- Later: **profiles** (siblings share iPads), each with an avatar animal + age.

---

## 10. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0 — Playable prototype** | `src/kids/`, age picker, bank (CDN samples), slots per tier, vibe dials with relationships, auto-play engine with abstract patterns, ☀️/🌙, key tiles, tempo, 3/4↔4/4, glow guidance, note-lights | A kid can build a 3-instrument song and flip mood/key/meter |
| 1 — Sound | Self-hosted curated samples, convolver reverb, per-instrument EQ/gain pass, memory budget | Every instrument sounds real on an iPad speaker |
| 2 — Patterns | Full library: 6 vibes × roles × 2 meters × 2 variants, complement generator tuning | Every dial position on every instrument is a "yes" |
| 3 — Save + profiles | Emoji names, tape shelf, profiles | |
| 4 — iPad app | Capacitor shell, audio session, parent gate, icons, TestFlight | Installed on a real iPad |
| 5 — Chord train | Number blocks 1–6 → train cars, letter-colored by key | |
| 6 — Polish | Recorded voice prompts, haptics, accessibility audit | |

---

## 11. QA log (v1 → v2)

| # | v1 problem | v2 fix |
|---|---|---|
| 1 | Color meant both "note" and "vibe" → confusing | Two systems, different widget shapes, never mixed |
| 2 | "Clash" could sound bad | Clash = genre mash, still quantized and in key |
| 3 | Complement was just "opposite color" | Defined musically: plays in the leader's rhythmic gaps |
| 4 | With 3+ instruments, the dial's reference was unclear | Slot 1 is the leader 👑; the crown moves if it's removed |
| 5 | 3-year-olds can't drag in circles | Dial supports tap-gem, tap-center and drag |
| 6 | Pre-readers can't read prompts | Spoken prompts + glow guidance |
| 7 | Extra "press play" step loses toddlers | Auto-start on the first instrument |
| 8 | Bank taps when full did nothing | Swap into the selected slot, or a wiggle signal |
| 9 | Mid-bar pattern swaps would glitch | Swaps resolve per 16th via the lookahead scheduler; meter waits for the bar line |
| 10 | Key changes push instruments out of range | Key offset wraps −5…+6 |
| 11 | Same-role pile-ups (two basses) get muddy | Second same-role instrument uses the alt variant, an octave up |
| 12 | iPad silent switch = "app is broken" | audioSession playback + native session category |
| 13 | Tone.Reverb / FeedbackDelay kill iOS audio (known from `engine.js`) | ConvolverNode with a generated impulse |
| 14 | Decoded samples can exhaust iPad memory | Lazy-load, release, budget |
| 15 | Per-note React re-renders jank on iPad | Ref-based DOM pulses |
| 16 | Sharps/flats confuse letter-only kids | 7 natural keys only |
| 17 | Siblings share one iPad | Profiles (phase 3) |
| 18 | Sample licenses unknown for App Store | License check is gated in phase 1 |

### QA round 2 — found while building Phase 0

| # | Problem | Fix |
|---|---|---|
| 19 | Bass in key B + spooky vibe resolved to F#0 (below a real bass) | Register clamp: every note folds into the instrument's sweet spot |
| 20 | Octave buttons + same-role stacking could run past the loaded samples (chipmunk pitch-shift) | Sample range = clamp range (base −24…+36) |
| 21 | CSS button reset out-ranked component styles (lost colors/sizes) | Reset wrapped in `:where()` (zero specificity) |
| 22 | Bobbing balloons were hard to hit | Bob reduced to 6 px |
| 23 | iOS blocks speech outside the tap | First prompt is spoken synchronously in the tap handler |
| 24 | Portrait squeezed the tempo lever | Song bar wraps; key bells get their own row in portrait |

---

## 12. Status

**Phase 0 is built** (`src/kids/`, open with `?kids` or the 🎈 Kids Mode button on the splash).

Verified in headless Chromium at iPad sizes (1180×820 landscape, 820×1180 portrait):
- all 16 instruments load with no missing samples
- note lights fire per slot
- tiers gate the controls correctly (3 → 3 slots / 8 instruments / ☀️🌙 only; 9+ → everything)
- 3/4 switches at the bar line
- the full slot → wiggle path works
- no console errors

**Not yet verified (needs ears + a real iPad):**
- how the vibes actually sound together, and the mix balance
- the complement feel
- silent-switch behavior
- speech on iOS

Known gaps carried into Phase 1+: CDN samples (self-host + license check), Google-font dependency (bundle it),
balloons reuse vibe hues (should get a neutral palette), and pattern content is one variant per role × vibe.
