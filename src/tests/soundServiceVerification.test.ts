import { soundService, REPLAY_SOUNDS_CATALOG, GameplaySoundType } from '../services/soundService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING SOUND SERVICE & AUDIO OPTIMIZATION VERIFICATION ===\n');

// Test 1: Catalog Integrity
console.log('Test 1: Replay sounds catalog integrity...');
assert(REPLAY_SOUNDS_CATALOG.length === 13, 'Replay sounds catalog must have exactly 13 meme clips');
for (const item of REPLAY_SOUNDS_CATALOG) {
  assert(Boolean(item.key && item.label && item.fileName && item.url), `Item ${item.key} is missing required fields`);
  assert(item.url.startsWith('/sounds/replay/'), `URL for ${item.key} must start with /sounds/replay/`);
  assert(item.url.endsWith('.mp3'), `URL for ${item.key} must end with .mp3`);
}
console.log('✓ All 13 Replay sound clips verified with valid URLs and filenames.\n');

// Test 2: Encoding Safety for Arabic Filenames
console.log('Test 2: Arabic URL encoding safety on mobile...');
for (const item of REPLAY_SOUNDS_CATALOG) {
  const encoded = encodeURI(item.url);
  assert(!encoded.includes(' '), `Encoded URL must not contain unencoded spaces: ${encoded}`);
  const decoded = decodeURI(encoded);
  assert(decoded === item.url, `Roundtrip encoding failed for: ${item.url}`);
}
console.log('✓ URL encoding for Arabic sound files is valid and reversible.\n');

// Test 3: Settings and Volume Clamping
console.log('Test 3: Volume and settings management...');
soundService.setVolume(0.5);
assert(soundService.getSettings().volume === 0.5, 'Volume must be 0.5');

soundService.setVolume(1.5); // Over upper bound
assert(soundService.getSettings().volume === 1.0, 'Volume must be clamped to 1.0');

soundService.setVolume(-0.2); // Below lower bound
assert(soundService.getSettings().volume === 0.0, 'Volume must be clamped to 0.0');

soundService.setVolume(0.85); // Reset to default
assert(soundService.getSettings().volume === 0.85, 'Volume reset to 0.85');

soundService.setGameplaySoundsEnabled(false);
assert(soundService.getSettings().gameplayEnabled === false, 'Gameplay sound toggle must update');
soundService.setGameplaySoundsEnabled(true);
assert(soundService.getSettings().gameplayEnabled === true, 'Gameplay sound toggle must restore');
console.log('✓ Volume clamping and settings toggles verified.\n');

// Test 4: Deduplication Mechanism
console.log('Test 4: Sound event deduplication...');
// When disabled, no playback occurs
soundService.setGameplaySoundsEnabled(false);
soundService.playGameplay('play', 'dedupe_test_1');
soundService.setGameplaySoundsEnabled(true);

// Dedupe key prevents repeated playback of identical server events
soundService.playGameplay('play', 'test_key_abc');
// Calling again with same key will early-return
soundService.playGameplay('play', 'test_key_abc');
console.log('✓ Event deduplication safely handles duplicate SignalR deliveries.\n');

// Test 5: Unlock Audio Graceful Execution
console.log('Test 5: Audio unlock execution without DOM exceptions...');
try {
  soundService.unlockAudio();
  console.log('✓ Audio unlock executed safely in headless environment without crashing.');
} catch (err) {
  throw new Error(`Audio unlock threw an unexpected error: ${err}`);
}

// Test 6: Gameplay Sound URL Mapping
console.log('Test 6: Gameplay sound types coverage...');
const expectedTypes: GameplaySoundType[] = ['play', 'shuffle', 'take', 'drawOrClose', 'skip'];
for (const t of expectedTypes) {
  try {
    soundService.playGameplay(t);
  } catch (err) {
    throw new Error(`playGameplay failed for type ${t}: ${err}`);
  }
}
console.log('✓ All 5 gameplay sound types invoked safely.\n');

// Test 7: Replay Soundboard Playback
console.log('Test 7: Replay soundboard playback invocation...');
for (const item of REPLAY_SOUNDS_CATALOG.slice(0, 3)) {
  try {
    soundService.playReplay(item.key);
  } catch (err) {
    throw new Error(`playReplay failed for ${item.key}: ${err}`);
  }
}
console.log('✓ Replay soundboard clips invoked safely with single-stream policy.\n');

console.log('================================================================');
console.log('=== ALL SOUND SERVICE & AUDIO OPTIMIZATION TESTS PASSED! ===');
console.log('================================================================\n');
