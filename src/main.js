import './style.css';

// Practice Loop keeps all of its information in the browser. Nothing is sent
// anywhere, which makes this little tool useful even without an account.
const STORAGE_KEY = 'practice-loop-sessions';
const RING_CIRCUMFERENCE = 2 * Math.PI * 104;

// The current timer state lives in these few variables.
let selectedMinutes = 15;
let remainingSeconds = selectedMinutes * 60;
let isRunning = false;
let isComplete = false;
let timerId = null;
let endTime = 0;

const timerValue = document.querySelector('#timer-value');
const timerCaption = document.querySelector('#timer-caption');
const timerState = document.querySelector('#session-state');
const ringProgress = document.querySelector('#ring-progress');
const toggleTimer = document.querySelector('#toggle-timer');
const toggleLabel = document.querySelector('#toggle-label');
const toggleIcon = document.querySelector('#toggle-icon');
const resetTimer = document.querySelector('#reset-timer');
const durationOptions = document.querySelectorAll('.duration-option');
const noteInput = document.querySelector('#session-note');
const noteCount = document.querySelector('#note-count');
const saveHint = document.querySelector('#save-hint');
const saveSession = document.querySelector('#save-session');
const historyList = document.querySelector('#history-list');
const emptyState = document.querySelector('#empty-state');
const clearHistory = document.querySelector('#clear-history');
const sessionCount = document.querySelector('#session-count');
const totalMinutes = document.querySelector('#total-minutes');
const totalSessions = document.querySelector('#total-sessions');

// Read saved sessions safely. A damaged localStorage value should not prevent
// the timer from working, so we simply start with an empty record instead.
function getSessions() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Practice history could not be read.', error);
    return [];
  }
}

function storeSessions(sessions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('Practice history could not be saved.', error);
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const leftoverSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(leftoverSeconds).padStart(2, '0')}`;
}

function renderTimer() {
  timerValue.textContent = formatTime(remainingSeconds);

  // The ring fills at the beginning and gradually empties as the session ends.
  const totalSeconds = selectedMinutes * 60;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));

  timerState.classList.toggle('is-running', isRunning);
  timerState.classList.toggle('is-complete', isComplete);
  ringProgress.classList.toggle('is-complete', isComplete);
  toggleTimer.disabled = isComplete;

  if (isComplete) {
    timerState.textContent = 'Session complete · nice work';
    timerCaption.textContent = 'a loop completed';
    toggleLabel.textContent = 'Session complete';
    toggleIcon.className = 'button-icon play-icon';
    saveSession.disabled = false;
    saveHint.textContent = noteInput.value.trim()
      ? 'Your note is ready to keep.'
      : 'Add a note, or save the quiet win.';
    saveHint.classList.add('is-ready');
    return;
  }

  if (isRunning) {
    timerState.textContent = 'In progress · find your pocket';
    timerCaption.textContent = 'time in the room';
    toggleLabel.textContent = 'Pause session';
    toggleIcon.className = 'button-icon pause-icon';
    return;
  }

  if (remainingSeconds < selectedMinutes * 60) {
    timerState.textContent = 'Paused · pick it back up';
    timerCaption.textContent = 'paused here';
    toggleLabel.textContent = 'Resume session';
  } else {
    timerState.textContent = 'Ready when you are';
    timerCaption.textContent = 'minutes to yourself';
    toggleLabel.textContent = 'Begin practice';
  }
  toggleIcon.className = 'button-icon play-icon';
}

function stopClock() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function completeSession() {
  stopClock();
  remainingSeconds = 0;
  isRunning = false;
  isComplete = true;
  durationOptions.forEach((option) => {
    option.disabled = true;
  });
  renderTimer();
}

function updateClock() {
  const secondsLeft = Math.ceil((endTime - Date.now()) / 1000);
  if (secondsLeft <= 0) {
    completeSession();
    return;
  }
  remainingSeconds = secondsLeft;
  renderTimer();
}

function startTimer() {
  if (isComplete || isRunning) return;
  isRunning = true;
  endTime = Date.now() + remainingSeconds * 1000;
  timerId = window.setInterval(updateClock, 250);
  renderTimer();
}

function pauseTimer() {
  if (!isRunning) return;
  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  isRunning = false;
  stopClock();
  renderTimer();
}

function resetTimerState() {
  stopClock();
  isRunning = false;
  isComplete = false;
  remainingSeconds = selectedMinutes * 60;
  durationOptions.forEach((option) => {
    option.disabled = false;
  });
  noteInput.value = '';
  updateNoteCount();
  saveSession.disabled = true;
  saveHint.textContent = 'Complete the timer to save a note.';
  saveHint.classList.remove('is-ready');
  renderTimer();
}

function updateNoteCount() {
  noteCount.textContent = `${noteInput.value.length} / 240`;
  if (isComplete) {
    saveHint.textContent = noteInput.value.trim()
      ? 'Your note is ready to keep.'
      : 'Add a note, or save the quiet win.';
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  if (sameDay) return `Today · ${time}`;
  return `${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)} · ${time}`;
}

function makeHistoryEntry(session, index) {
  const entry = document.createElement('article');
  entry.className = 'history-entry';
  entry.style.animationDelay = `${Math.min(index, 6) * 45}ms`;

  const duration = document.createElement('div');
  duration.className = 'entry-duration';
  duration.textContent = String(session.duration);
  const durationLabel = document.createElement('small');
  durationLabel.textContent = 'minutes';
  duration.append(durationLabel);

  const note = document.createElement('p');
  note.className = `entry-note${session.note ? '' : ' is-empty'}`;
  note.textContent = session.note || 'No note added';

  const date = document.createElement('time');
  date.className = 'entry-date';
  date.dateTime = new Date(session.completedAt).toISOString();
  date.textContent = formatDate(session.completedAt);

  entry.append(duration, note, date);
  return entry;
}

function renderHistory() {
  const sessions = getSessions();
  historyList.replaceChildren();
  sessions.forEach((session, index) => {
    historyList.append(makeHistoryEntry(session, index));
  });

  const minutes = sessions.reduce((sum, session) => sum + Number(session.duration || 0), 0);
  totalMinutes.textContent = String(minutes);
  totalSessions.textContent = String(sessions.length);
  sessionCount.textContent = String(sessions.length);
  emptyState.hidden = sessions.length > 0;
  clearHistory.hidden = sessions.length === 0;
}

function saveCompletedSession() {
  if (!isComplete) return;

  const sessions = getSessions();
  sessions.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    duration: selectedMinutes,
    note: noteInput.value.trim(),
    completedAt: new Date().toISOString(),
  });
  storeSessions(sessions);
  renderHistory();
  resetTimerState();
  saveHint.textContent = 'Saved. Come back when you are ready.';
}

// Choosing a preset is intentionally disabled while a session is in progress,
// so one accidental click cannot change the promise made by the timer.
durationOptions.forEach((option) => {
  option.addEventListener('click', () => {
    if (isRunning || isComplete) return;
    selectedMinutes = Number(option.dataset.minutes);
    remainingSeconds = selectedMinutes * 60;
    durationOptions.forEach((item) => {
      item.classList.toggle('is-selected', item === option);
    });
    renderTimer();
  });
});

toggleTimer.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetTimer.addEventListener('click', resetTimerState);
noteInput.addEventListener('input', updateNoteCount);
saveSession.addEventListener('click', saveCompletedSession);

clearHistory.addEventListener('click', () => {
  if (getSessions().length === 0) return;
  if (window.confirm('Clear all saved practice sessions?')) {
    storeSessions([]);
    renderHistory();
  }
});

// Draw the initial state as soon as the page opens.
ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
updateNoteCount();
renderTimer();
renderHistory();