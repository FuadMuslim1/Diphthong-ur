// ---- Modal controls ----
const modal = document.getElementById('videoModal');
const openBtn = document.getElementById('openVideo');
const closeBtn = document.getElementById('closeVideo');
const playBtn = document.getElementById('playNow');
const pauseBtn = document.getElementById('pauseNow');

openBtn.addEventListener('click', () => {
  modal.hidden = false;
  if (player && player.seekTo) {
    player.seekTo(0);
  }
  // make sure player (under header) is visible to the user
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
});
closeBtn.addEventListener('click', () => {
  modal.hidden = true;
  if (player && player.pauseVideo) player.pauseVideo();
  clearActive();
});
playBtn.addEventListener('click', () => player && player.playVideo && player.playVideo());
pauseBtn.addEventListener('click', () => player && player.pauseVideo && player.pauseVideo());

// ---- Highlight logic ----
const cards = Array.from(document.querySelectorAll('.word-card'));

// Cue times (seconds) when each word starts in the video.
// Disesuaikan untuk 19 kata, dengan perkiraan 1 detik per kata.
const cueTimes = [
  0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5,
  10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5, 17.5, 18.5
];

let currentIndex = -1;
function setActive(index) {
  // Hanya digunakan untuk membersihkan highlight yang mungkin ada.
  if (index === currentIndex) return;
  clearActive();
  if (index >= 0 && index < cards.length) {
    currentIndex = index;
    // Highlight the card at the current index
    cards[index].classList.add('active');
  }
}
function clearActive() {
  // Hapus kelas 'active' dari semua kartu.
  cards.forEach(card => card.classList.remove('active'));
  currentIndex = -1;
}

// ---- Autoscroll triggers ----
// Map explicit times to the word text we want to scroll to.
// Hanya menggunakan 3 titik pemicu untuk 19 kata.
const timeTriggers = [
  { time: 0.5, word: 'Allure' },
  { time: 9.5, word: 'Pure' },
  { time: 17.5, word: 'Plural' }
];
const triggered = new Set();

function resetTriggers() {
  triggered.clear();
}

function scrollToWordByText(word) {
  const el = Array.from(document.querySelectorAll('.word-card .word'))
    .find(p => p.textContent.trim().toLowerCase() === word.toLowerCase());
  if (!el) return;
  const card = el.closest('.word-card');
  // If the player is visible under the header, offset scroll so the card
  // appears below the header + player bar.
  const playerContent = document.querySelector('.player-content');
  const header = document.querySelector('header');
  const elementAbsoluteTop = el.getBoundingClientRect().top + window.scrollY;
  if (playerContent && !document.getElementById('videoModal').hidden) {
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const playerHeight = playerContent.getBoundingClientRect().height;
    const gap = 18; // px gap between player and scrolled-to card
    const scrollTarget = Math.max(0, elementAbsoluteTop - (headerHeight + playerHeight + gap));
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  } else {
    // No player visible: just bring into view
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ---- YouTube IFrame API ----
let player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    videoId: '_rDNY7t6nUY', // New Shorts ID from your link
    playerVars: {
      modestbranding: 1,
      rel: 0,
      playsinline: 1
    },
    events: {
      onReady: () => {
        if (!modal.hidden) player.playVideo();
        startTick();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.ENDED) {
          clearActive();
        }
      }
    }
  });
}

// ---- Time-based ticker to update highlights ----
let tickId = null;
function startTick() {
  if (tickId) return;
  tickId = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    const t = player.getCurrentTime();
    
    // time-triggered autoscroll + explicit highlights
    for (const trig of timeTriggers) {
      // small tolerance so it fires when we pass the time
      if (t >= trig.time && !triggered.has(trig.time)) {
        triggered.add(trig.time);
        scrollToWordByText(trig.word);
        
        // Tambahkan highlight visual khusus untuk kata yang di-scroll-to
        const el = Array.from(document.querySelectorAll('.word-card .word'))
          .find(p => p.textContent.trim().toLowerCase() === trig.word.toLowerCase());
        if (el) {
          const card = el.closest('.word-card');
          // Hapus semua highlight sebelumnya dari kata-kata yang bukan trigger
          clearActive(); 
          
          card.classList.add('active'); // Tambahkan highlight
          // Hapus highlight setelah durasi singkat
          setTimeout(() => {
            if (card) card.classList.remove('active');
          }, 2000);
        }
      }
    }
    
    // Perbarui highlight berdasarkan cueTimes (untuk semua kata)
    let nextIndex = -1;
    for (let i = 0; i < cueTimes.length; i++) {
      // Find the last cue time that has passed, or is happening now
      if (t >= cueTimes[i]) {
        nextIndex = i;
      } else {
        // Since cueTimes is sorted, we can stop searching once 't' is less than a cueTime
        break;
      }
    }

    if (nextIndex !== currentIndex) {
        // Hapus highlight jika itu adalah kata yang dipicu oleh timeTrigger 
        // karena itu memiliki logika highlight sendiri (setelah 2 detik hilang).
        // Kita hanya mengaktifkan highlight dari logika cueTimes
        const cardToActivate = cards[nextIndex];
        if (cardToActivate && !cardToActivate.classList.contains('active')) {
            setActive(nextIndex);
        } else if (nextIndex === -1 && currentIndex !== -1) {
            clearActive();
        }
    }

  }, 100); // update 10 times per second
}

window.addEventListener('beforeunload', () => {
  if (tickId) clearInterval(tickId);
});

// Reset triggers when modal opens/closes or when user seeks to start
openBtn.addEventListener('click', () => {
  resetTriggers();
});
closeBtn.addEventListener('click', () => {
  resetTriggers();
});

// If the player supports onStateChange events, ensure triggers reset on seek
function safeSeekToStart() {
  if (player && player.seekTo) {
    player.seekTo(0);
    resetTriggers();
  }
}