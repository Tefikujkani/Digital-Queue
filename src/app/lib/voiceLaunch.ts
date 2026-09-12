import { openAssistant } from './assistantUi'
import { unlockMicAudio } from './micSounds'
import { unlockSpeechPlayback } from './speech'

/** Open voice and start listening in the same tap — phone and laptop. */
export function launchVoiceAssistant() {
  unlockMicAudio()
  unlockSpeechPlayback()
  openAssistant('voice', { listen: true })
}
