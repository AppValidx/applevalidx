const MESSAGES = [
  "Quiet is a form of power.",
  "Nothing to unlock. Ownership is the feature.",
  "A record doesn’t explain itself.",
  "If it needs noise, it isn’t real.",
  "Status is what remains when you stop performing.",
  "Scarcity is discipline, not price.",
  "The work speaks. The rest is marketing.",
  "No benefits included. That’s the point.",
  "Not for everyone. Not explained to anyone.",
  "Consistency is louder than attention.",
  "Respect is the only currency that never inflates.",
  "You don’t prove it. You live it.",
  "A clean trajectory needs no defense.",
  "Elegance is subtraction.",
  "Private doesn’t mean hidden. It means intentional.",
];

// YYYY-MM-DD in local time (simple + stable)
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Simple deterministic hash
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getDailyMessage(): string {
  const idx = hash(todayKey()) % MESSAGES.length;
  return MESSAGES[idx];
}
