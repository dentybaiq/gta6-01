// Keyboard + mouse input: one shared state object, edge-triggered "pressed" keys,
// and a world-space mouse position the camera fills in each frame.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // keys pressed since last frame, cleared by endFrame()
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mousePressed: false,
    worldX: 0,
    worldY: 0,
    anyKey: false,
  };

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.keys.add(codeOf(event));
      input.pressed.add(codeOf(event));
      input.anyKey = true;
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(codeOf(event));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouseDown = true;
      input.mousePressed = true;
      input.anyKey = true;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.isDown = (code) => input.keys.has(code);
  input.wasPressed = (code) => input.pressed.has(code);
  input.axis = () => {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    return { x, y };
  };
  input.endFrame = () => {
    input.pressed.clear();
    input.mousePressed = false;
    input.anyKey = false;
  };
  return input;
}
