/**
 * MASCAL / Field Command — start screen and instant field briefing.
 * The overlay is UI only. The caller owns the game's simulation clock.
 * No dependencies, external resources or gameplay-state mutations.
 */
const SCREEN_LABELS = {
  ready: 'OPERATIONAL READY',
  paused: 'MISSION PAUSED',
};

function toClock(seconds) {
  const value = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function createStartScreen({ mission, inputHandler, helpButton }) {
  if (!mission?.core?.state || !inputHandler) {
    throw new Error('MASCAL StartScreen: required mission state or input is missing');
  }

  const state = mission.core.state;
  const overlay = document.createElement('div');
  overlay.className = 'mascal-launch';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'launch-title');
  overlay.setAttribute('aria-describedby', 'launch-description');
  overlay.dataset.mode = 'intro';
  overlay.innerHTML = `
    <div class="launch-shade" aria-hidden="true"></div>
    <main class="launch-console">
      <div class="launch-rail">
        <div class="launch-rail-left"><span class="launch-insignia">M<span>·</span></span>
          <span>MASCAL <b>/</b> FIELD COMMAND</span></div>
        <div class="launch-rail-right"><span class="launch-pulse"></span><span id="launch-state">OPERATIONAL READY</span><span class="launch-version">EN BUILD · 19.10</span></div>
      </div>
      <div class="launch-columns">
        <section class="launch-main">
          <div class="launch-eyebrow"><span class="launch-index">01 / MISSION</span> &nbsp; TRAIN DERAILMENT</div>
          <h1 id="launch-title">MASCAL<span>CRITICAL<br>DECISIONS<span class="launch-title-dot">.</span></span></h1>
          <p id="launch-description" class="launch-pitch">You are the first responder at a train derailment. Assess casualties, set priorities, and coordinate evacuation before time runs out.</p>
          <div class="launch-facts" aria-label="Mission details">
            <div><small>ROUND</small><strong id="launch-round">01 / 05</strong></div>
            <div><small>CASUALTIES</small><strong id="launch-patients">06</strong></div>
            <div><small>TIME LIMIT</small><strong id="launch-timer">05:00</strong></div>
          </div>
          <div class="launch-cta-row">
            <button class="launch-play" type="button" data-launch="play"><span class="launch-arrow">▶</span><span id="launch-play-text">START MISSION</span><span class="launch-shortcut">ENTER</span></button>
            <button class="launch-manual" type="button" data-launch="instructions" aria-controls="launch-guide" aria-expanded="false">HOW TO PLAY <span>↗</span></button>
          </div>
          <div class="launch-footer-note"><span class="launch-dot"></span> The timer starts only when you press Start Mission.</div>
        </section>
        <aside class="launch-brief" id="launch-guide" aria-label="Quick instructions">
          <header class="launch-brief-head"><span>FIELD BRIEFING</span><b id="launch-brief-label">READY IN 20 SECONDS</b></header>
          <div class="launch-quick" data-launch-panel="quick">
            <div class="launch-step"><span class="launch-step-number">01</span><div><strong>FIND A CASUALTY</strong><p>Move with <kbd>W A S D</kbd>. Approach a casualty and press <kbd>E</kbd>.</p></div></div>
            <div class="launch-step"><span class="launch-step-number">02</span><div><strong>SET TRIAGE PRIORITY</strong><p>Choose a triage category. Your decision determines who gets treated first.</p>
              <div class="launch-priority"><span class="priority-green">1 GREEN</span><span class="priority-yellow">2 YELLOW</span><span class="priority-red">3 RED</span><span class="priority-black">4 BLACK</span></div>
            </div></div>
            <div class="launch-step"><span class="launch-step-number">03</span><div><strong>COMMAND THE RESPONSE</strong><p>Rescue teams treat and evacuate casualties automatically. React to alerts and watch the clock.</p></div></div>
            <div class="launch-brief-foot"><span>GOAL</span> Assess and save as many people as you can. Every decision matters.</div>
          </div>
          <div class="launch-guide" data-launch-panel="guide" hidden>
            <div class="launch-guide-item"><kbd>W A S D</kbd><span>Move your responder</span></div>
            <div class="launch-guide-item"><kbd>E</kbd><span>Assess casualty / collect a crate</span></div>
            <div class="launch-guide-item"><kbd>1–4</kbd><span>Triage / event choice</span></div>
            <div class="launch-guide-item"><kbd>T</kbd><span>Attach a collected STT band</span></div>
            <div class="launch-guide-item"><kbd>G</kbd><span>Use a collected medical kit</span></div>
            <div class="launch-guide-item"><kbd>F</kbd><span>Call helicopter support if collected</span></div>
            <div class="launch-guide-item"><kbd>H</kbd><span>Open / close this guide</span></div>
            <div class="launch-guide-item"><kbd>ESC</kbd><span>Close the casualty card or guide</span></div>
            <p class="launch-guide-tip"><b>IMPORTANT</b> Support items spawn rarely and at random locations. STT bands reveal changing vital signs, but you still make triage decisions.</p>
            <p class="launch-guide-tip subdued">Fictional game simulation. Not medical guidance or a real-world triage protocol.</p>
          </div>
        </aside>
      </div>
      <div class="launch-bottom"><span>TRAIN INCIDENT / NIGHT OPS</span><span>DECISIONS HAVE CONSEQUENCES</span><span>H — HELP</span></div>
    </main>
  `;
  document.body.append(overlay);

  overlay.querySelector('#launch-round').textContent = `${String(state.round).padStart(2, '0')} / 05`;
  overlay.querySelector('#launch-patients').textContent = String(state.patients.length).padStart(2, '0');
  overlay.querySelector('#launch-timer').textContent = toClock(state.duration);

  const play = overlay.querySelector('[data-launch="play"]');
  const instructions = overlay.querySelector('[data-launch="instructions"]');
  const quickPanel = overlay.querySelector('[data-launch-panel="quick"]');
  const fullPanel = overlay.querySelector('[data-launch-panel="guide"]');
  let started = false;
  let open = true;
  let showingGuide = false;
  let restoreFocus = null;

  function showGuide(enabled) {
    showingGuide = enabled;
    quickPanel.hidden = enabled;
    fullPanel.hidden = !enabled;
    instructions.setAttribute('aria-expanded', String(enabled));
    instructions.innerHTML = enabled ? 'QUICK BRIEFING <span>↗</span>' : 'HOW TO PLAY <span>↗</span>';
    overlay.querySelector('#launch-brief-label').textContent = enabled ? 'ALL CONTROLS' : 'READY IN 20 SECONDS';
  }

  function hide() {
    open = false;
    overlay.hidden = true;
    document.body.classList.remove('mascal-launch-open');
    inputHandler.enableAndClear();
    if (started && restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  }

  function beginOrResume() {
    if (!started) {
      started = true;
      const status = document.querySelector('.mission-head .status-dot');
      if (status) status.innerHTML = 'LIVE <i aria-hidden="true"></i> MISSION ACTIVE';
    }
    hide();
  }

  function openHelp() {
    if (open) return true;
    if (!started || state.phase !== 'playing' || inputHandler.isDisabled()) return false;
    if (document.querySelector('.triage-patient-modal.is-open, .domino-event-modal.is-open, .triage-end-modal.is-open')) return false;
    restoreFocus = document.activeElement;
    open = true;
    overlay.hidden = false;
    overlay.dataset.mode = 'pause';
    document.body.classList.add('mascal-launch-open');
    inputHandler.setDisabled();
    inputHandler.queue.length = 0;
    overlay.querySelector('#launch-state').textContent = SCREEN_LABELS.paused;
    overlay.querySelector('#launch-play-text').textContent = 'RESUME MISSION';
    overlay.querySelector('.launch-footer-note').textContent = 'Mission paused. The timer is stopped while you read.';
    showGuide(true);
    play.focus();
    return true;
  }

  function handleKeydown(event) {
    if (open) {
      if (event.key === 'Escape' && started) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hide();
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        event.stopImmediatePropagation();
        showGuide(!showingGuide);
        return;
      }
      // Keep Tab navigation and native keyboard activation on dialog buttons.
      if (event.key === 'Tab') {
        const buttons = [play, instructions];
        const active = document.activeElement;
        if (event.shiftKey && active === buttons[0]) {event.preventDefault();buttons[1].focus();}
        else if (!event.shiftKey && active === buttons[1]) {event.preventDefault();buttons[0].focus();}
        return;
      }
      if (event.key === 'Enter' && !event.repeat && document.activeElement !== instructions) {
        event.preventDefault();
        event.stopImmediatePropagation();
        beginOrResume();
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && document.activeElement?.tagName === 'BUTTON') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if ((event.key === 'h' || event.key === 'H') && !event.repeat && openHelp()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  instructions.addEventListener('click', () => showGuide(!showingGuide));
  play.addEventListener('click', beginOrResume);
  if (helpButton) helpButton.addEventListener('click', openHelp);
  window.addEventListener('keydown', handleKeydown, { capture: true });
  document.body.classList.add('mascal-launch-open');
  inputHandler.setDisabled();
  const status = document.querySelector('.mission-head .status-dot');
  if (status) status.textContent = SCREEN_LABELS.ready;
  play.focus();

  return {
    isBlocking: () => open,
    hasStarted: () => started,
    openHelp,
    dispose() {
      window.removeEventListener('keydown', handleKeydown, true);
      overlay.remove();
      document.body.classList.remove('mascal-launch-open');
    },
  };
}
