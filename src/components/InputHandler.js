export default function createInputHandler() {
  const queue = [];
  const heldKeys = {};
  let spacePressed = false;
  let disabled = false;

  const keyMap = {
    ArrowUp: 'forward',
    ArrowDown: 'backward',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right'
  };

  window.addEventListener('keydown', (event) => {
    // Always capture Space for restart during Game Over, even when disabled
    if (event.key === ' ' && !heldKeys[' ']) {
      heldKeys[' '] = true;
      spacePressed = true;
    }

    if (disabled) return;

    const action = keyMap[event.key] || keyMap[event.code];
    if (action && !heldKeys[event.code]) {
      heldKeys[event.code] = true;
      queue.push(action);
    }
  });

  window.addEventListener('keyup', (event) => {
    if (keyMap[event.key] || keyMap[event.code]) {
      heldKeys[event.code] = false;
    }
    if (event.key === ' ') {
      heldKeys[' '] = false;
    }
  });

  return {
    queue,
    getNext() {
      return queue.shift();
    },
    hasPending() {
      return queue.length > 0;
    },
    isHeld() {
      return !disabled && Object.entries(heldKeys).some(([key, held]) => held && Boolean(keyMap[key]));
    },
    getHeldDirection() {
      if (disabled) return null;
      for (const [key, held] of Object.entries(heldKeys)) {
        if (held === true && keyMap[key]) {
          return keyMap[key];
        }
      }
      return null;
    },
    /**
     * Check and consume the Space key press flag.
     * @returns {boolean} true if Space was pressed since last call
     */
    wasSpacePressed() {
      const pressed = spacePressed;
      spacePressed = false;
      return pressed;
    },
    /**
     * Disable all input (used during Game Over).
     */
    setDisabled() {
      disabled = true;
    },
    /**
     * Re-enable input and clear the queue (used on restart).
     */
    enableAndClear() {
      disabled = false;
      queue.length = 0;
      for (const key of Object.keys(heldKeys)) {
        heldKeys[key] = false;
      }
      spacePressed = false;
    },
    /**
     * Check if input is currently disabled.
     * @returns {boolean}
     */
    isDisabled() {
      return disabled;
    }
  };
}
