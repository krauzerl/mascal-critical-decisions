import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStartScreen } from '../src/components/StartScreen.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/start-screen.css', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../src/components/StartScreen.js', import.meta.url), 'utf8');

assert.equal(typeof createStartScreen, 'function', 'Eksport createStartScreen jest dostępny');
assert.match(main, /import\s+'\.\/start-screen\.css'/, 'Nowy CSS jest importowany');
assert.match(main, /import\s+\{ createStartScreen \} from '\.\/components\/StartScreen\.js'/, 'Moduł jest importowany');
assert.match(main, /const onboarding = createStartScreen\(/, 'Ekran startowy jest inicjalizowany');
assert.match(main, /if \(!onboarding\.isBlocking\(\)\) mission\.render\(delta, time\)/,
  'Pętla misji jest zatrzymana przy widocznym ekranie startowym lub instrukcji');
assert.match(main, /onboarding\.isBlocking\(\) \|\| inputHandler\.isDisabled\(\)/,
  'Blokowana jest obsługa ruchu gracza podczas instrukcji');
assert.match(main, /id="open-mission-guide"/, 'Przycisk pomocy jest dostępny podczas gry');
assert.match(screen, /window\.addEventListener\('keydown', handleKeydown, \{ capture: true \}\)/,
  'Instrukcja przechwytuje sterowanie klawiaturą przed mechaniką gry');
assert.match(screen, /state\.patients\.length/, 'Liczba pacjentów jest pobierana ze stanu gry');
assert.match(screen, /state\.duration/, 'Czas rundy jest pobierany ze stanu gry');
assert.match(css, /\.mascal-launch\[hidden\]/, 'Ukrywanie overlay działa');
console.log('PASS: start screen wiring, simulation pause gating, help keyboard controls, dynamic mission facts');
