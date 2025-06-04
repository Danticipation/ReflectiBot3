// Timestamp extraction and labeling logic
export interface TimeContext {
  timestamp: Date;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isWeekend: boolean;
  relativeTime: string;
}

export function extractTimeContext(message: string, currentTime: Date = new Date()): TimeContext {
  const timeOfDay = getTimeOfDay(currentTime);
  const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
  
  // Extract relative time references from message
  const relativeTime = extractRelativeTimeFromMessage(message, currentTime);
  
  return {
    timestamp: currentTime,
    timeOfDay,
    dayOfWeek,
    isWeekend,
    relativeTime
  };
}

function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function extractRelativeTimeFromMessage(message: string, currentTime: Date): string {
  const lowerMessage = message.toLowerCase();
  
  // Direct time references
  if (lowerMessage.includes('today')) return 'today';
  if (lowerMessage.includes('yesterday')) return 'yesterday';
  if (lowerMessage.includes('tomorrow')) return 'tomorrow';
  if (lowerMessage.includes('this morning')) return 'this morning';
  if (lowerMessage.includes('this afternoon')) return 'this afternoon';
  if (lowerMessage.includes('this evening')) return 'this evening';
  if (lowerMessage.includes('last night')) return 'last night';
  if (lowerMessage.includes('right now') || lowerMessage.includes('currently')) return 'right now';
  
  // Week references
  if (lowerMessage.includes('this week')) return 'this week';
  if (lowerMessage.includes('last week')) return 'last week';
  if (lowerMessage.includes('next week')) return 'next week';
  
  // Month references
  if (lowerMessage.includes('this month')) return 'this month';
  if (lowerMessage.includes('last month')) return 'last month';
  if (lowerMessage.includes('next month')) return 'next month';
  
  // Recent time indicators
  if (lowerMessage.includes('just now') || lowerMessage.includes('a moment ago')) return 'just now';
  if (lowerMessage.includes('earlier')) return 'earlier today';
  if (lowerMessage.includes('recently')) return 'recently';
  
  // Default to current moment if no specific time reference found
  return 'now';
}

export function generateTimeBasedContext(timeContext: TimeContext): string {
  const { timeOfDay, dayOfWeek, isWeekend, relativeTime } = timeContext;
  
  let context = `It's ${timeOfDay} on ${dayOfWeek}`;
  
  if (isWeekend) {
    context += ' (weekend)';
  }
  
  if (relativeTime !== 'now') {
    context += `, and they're referring to ${relativeTime}`;
  }
  
  return context;
}

export function shouldPrioritizeMemory(timeContext: TimeContext, message: string): boolean {
  // Prioritize memories from significant times
  const significantTimes = [
    'birthday', 'anniversary', 'holiday', 'graduation', 
    'wedding', 'promotion', 'first day', 'last day'
  ];
  
  const lowerMessage = message.toLowerCase();
  const hasSignificantEvent = significantTimes.some(event => lowerMessage.includes(event));
  
  // Weekend conversations might be more personal
  const isPersonalTime = timeContext.isWeekend || 
                        timeContext.timeOfDay === 'evening' || 
                        timeContext.timeOfDay === 'night';
  
  return hasSignificantEvent || (isPersonalTime && lowerMessage.length > 50);
}