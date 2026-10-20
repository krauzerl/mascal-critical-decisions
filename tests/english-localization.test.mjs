import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTriageCore, MAX_ROUND } from '../src/components/TriageCore.js';
import { sampleGameVitals } from '../src/components/TacticalSupport.js';

const files = [
  '../index.html', '../src/main.js',
  '../src/components/StartScreen.js',
  '../src/components/TriageCore.js',
  '../src/components/TriageScene.js',
  '../src/components/TacticalSupport.js',
  '../src/components/SupportPickups.js',
  '../src/components/Obstacle.js',
];
const content = Object.fromEntries(files.map(file => [file, readFileSync(new URL(file, import.meta.url), 'utf8')]));
assert.match(content['../index.html'], /<html lang="en">/);
assert.match(content['../src/components/StartScreen.js'], /START MISSION/);
assert.match(content['../src/components/StartScreen.js'], /HOW TO PLAY/);
assert.match(content['../src/components/TriageScene.js'], /MISSION DEBRIEF/);
assert.match(content['../src/components/TriageScene.js'], /COMMS \/ CHANNEL 01/);
assert.match(content['../src/components/TriageScene.js'], /STT/);
assert.match(content['../src/components/TriageScene.js'], /HEMS/);
assert.match(content['../src/components/Obstacle.js'], /'RESCUE'/);
for (const [filename, source] of Object.entries(content)) {
  assert.doesNotMatch(source, /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/, `Polish diacritics remain in ${filename}`);
}
const disallowed = ['KOORDYNACJA','AKTYWNA','Brak odczytu','Zebrano ', 'Ocena #', 'Wezwano wsparcie', 'Pilny priorytet'];
for (const [filename, source] of Object.entries(content)) {
  for (const word of disallowed) assert.ok(!source.includes(word), `${word} remains in ${filename}`);
}
for (let round = 1; round <= MAX_ROUND; round++) {
  const game = createTriageCore({ round, seed: 7 });
  assert.equal(game.state.patients.length, 4 + 2 * round);
  assert.ok(game.state.scenario.name.startsWith('Derailment'));
  for (const patient of game.state.patients) {
    assert.ok(patient.signs.length >= 3);
    assert.ok(patient.signs.every(sign => !/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(sign)));
    const vitals = sampleGameVitals(patient, 25);
    assert.ok(['No reading','No significant change','Vitals fluctuating','Warning: abnormal trend'].includes(vitals.trend));
  }
}
{
  const game = createTriageCore();
  game.tagPatient('02','red');
  const messages = game.state.events.map(e=>e.message).join(' ');
  assert.ok(messages.includes('Team') || messages.includes('Triage'));
}
console.log('PASS: English UI, START/HELP, HEMS, casualty signs, telemetry, all five rounds');
