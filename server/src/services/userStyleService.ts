export function updateUserStyleAndGetPrompt({
  recentMessages,
  previousStyle
}: {
  recentMessages: string[];
  previousStyle: string;
}): string {
  // ✨ Basic placeholder logic
  const joined = recentMessages.join(' ').toLowerCase();

  if (joined.includes("bro") || joined.includes("dude")) {
    return "surfer";
  }

  if (joined.includes("indeed") || joined.includes("however")) {
    return "formal";
  }

  return previousStyle || "neutral";
}
