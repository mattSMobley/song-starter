import { useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour.css'

const STEPS = [
  {
    element: '[data-tour="regenerate"]',
    popover: {
      title: 'Generate melodies',
      description: 'Set your <strong>key</strong>, <strong>scale</strong>, and <strong>bar length</strong> up top, then hit <strong>Regenerate</strong> to instantly create 8 unique melody ideas.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="melody-area"]',
    popover: {
      title: 'Play, save & export',
      description: 'Hit <strong>▶</strong> to preview any melody. Download as <strong>MIDI</strong> or <strong>WAV</strong>, set it on loop, or save it to your Session.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="mic-btn"]',
    popover: {
      title: 'Vocal autotune',
      description: 'Tap to pitch-shift your voice to the current scale in real time. The <strong>AT</strong> button below it toggles correction on or off.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="session-tab"]',
    popover: {
      title: 'Build a full song',
      description: 'Save loops here and stack them up. The Session tab is where a quick sketch grows into a real song.',
      side: 'bottom',
      align: 'start',
    },
  },
]

export function useTour() {
  const driverRef = useRef(null)

  function build() {
    driverRef.current?.destroy()
    driverRef.current = driver({
      animate: true,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: "Let's go ✦",
      overlayOpacity: 0.6,
      stagePadding: 10,
      stageRadius: 14,
      popoverClass: 'ss-tour',
      steps: STEPS,
      onDestroyStarted: () => {
        localStorage.setItem('ss_tour_done', '1')
        driverRef.current?.destroy()
      },
    })
  }

  function startTour() {
    build()
    driverRef.current?.drive()
  }

  // Call this once after the app mounts — auto-starts only on first visit
  function maybeAutoStart() {
    if (!localStorage.getItem('ss_tour_done')) {
      setTimeout(() => { build(); driverRef.current?.drive() }, 950)
    }
  }

  return { startTour, maybeAutoStart }
}
