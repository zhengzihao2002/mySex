import {
  Activity, Award, BatteryLow, BookOpen, CheckCheck, CircleHelp, Compass,
  CalendarDays, Car, Cloud, Coffee, Drama, Feather, Film, Globe, Handshake,
  House, KeyRound, Medal, MessageCircle, Music2, PenLine, Plane, SlidersHorizontal, Trees,
  Crown, Droplets, Flame, Flower2, Footprints, Gem, HandHeart, Heart,
  HeartHandshake, LockKeyhole, MapPin, Moon, Pill, Shield, Smile,
  Snowflake, Sparkles, Sprout, Star, Sun, Sunrise, Sunset, Trophy,
  Waves, Wind, Wine, Zap, type LucideIcon,
} from 'lucide-react';

// Presentation only: legacy avatar and badge values keep their stored identity.
const symbols: Record<string, [LucideIcon, string]> = {
  '💋': [Heart, 'Heart'], '😈': [Flame, 'Flame'], '🍑': [Flower2, 'Flower'],
  '🍆': [HeartHandshake, 'Together'], '🔥': [Flame, 'Heat'], '🌶️': [Zap, 'Spark'],
  '💦': [Waves, 'Waves'], '🦊': [Compass, 'Explorer'], '🐻': [Shield, 'Guardian'],
  '🐰': [Sprout, 'Sprout'], '👑': [Crown, 'Crown'], '🌹': [Flower2, 'Rose'],
  '💜': [Gem, 'Gem'], '🖤': [Moon, 'Moon'], '😇': [Sun, 'Sun'], '🥂': [Wine, 'Toast'],
  '🩸': [Droplets, 'Period'], '🌱': [Sprout, 'Follicular'], '🌙': [Moon, 'Luteal'],
  '😏': [Sparkles, 'Flirty'], '😊': [Smile, 'Happy'], '🥰': [HandHeart, 'Loved'],
  '😌': [Wind, 'Chill'], '😴': [Moon, 'Tired'], '😩': [Activity, 'Stressed'],
  '🥺': [Heart, 'Needy'], '😤': [Wind, 'Grumpy'], '👅': [Waves, 'Oral'],
  '🎈': [Shield, 'Condom'], '💊': [Pill, 'Pill or IUD'], '🏃': [Footprints, 'Pull-out'],
  '😳': [CircleHelp, 'No protection'], '💌': [HandHeart, 'Love note'],
  '🧊': [Snowflake, 'Low'], '🙂': [Smile, 'Steady'], '🥵': [Flame, 'High'],
  '🪫': [BatteryLow, 'Low energy'], '😪': [Moon, 'Low energy'], '⚡': [Zap, 'Energy'],
  '🚀': [Sunrise, 'High energy'], '💧': [Droplets, 'Flow'], '🧭': [Compass, 'Explorer'],
  '🏆': [Trophy, 'Achievement'], '📖': [BookOpen, 'History'], '🥚': [Sun, 'Ovulation'],
  '💯': [CheckCheck, 'Both said yes'], '🤔': [CircleHelp, 'At least one maybe'],
  '🔒': [LockKeyhole, 'Private'], '📍': [MapPin, 'Location'], '🃏': [Sparkles, 'Draw a card'],
  '❤️': [Heart, 'Heart'], '💗': [Heart, 'Heart'], '💙': [Heart, 'Heart'],
  '🔟': [Award, 'Milestone'], '🏅': [Medal, 'Medal'], '✌️': [CheckCheck, 'Twice'],
  '🎩': [Sparkles, 'Surprise'], '🦉': [Moon, 'Night'], '🥪': [Sun, 'Midday'],
  '🗺️': [Compass, 'Places'], '🌍': [Globe, 'World'], '✈️': [Plane, 'Travel'],
  '📆': [CalendarDays, 'Calendar'], '🌲': [Trees, 'Outdoors'], '🚗': [Car, 'Car'],
  '📚': [BookOpen, 'Collection'], '✍️': [PenLine, 'Writing'], '💭': [MessageCircle, 'Reflection'],
  '🗓️': [CalendarDays, 'Calendar'], '🍵': [Coffee, 'Slow down'], '🤝': [Handshake, 'Together'],
  '🌤️': [Sun, 'Daylight'], '🛁': [Droplets, 'Water'], '🎭': [Drama, 'Roleplay'],
  '🛌': [Moon, 'Rest'], '🪩': [Music2, 'Music'], '🫧': [Droplets, 'Bubbles'],
  '🏡': [House, 'Home'], '🎬': [Film, 'Scene'], '📜': [BookOpen, 'Story'],
  '🕊️': [Feather, 'Gentle'], '📻': [Music2, 'Music'], '🗝️': [KeyRound, 'Unlock'],
  '🖋️': [PenLine, 'Writing'], '☁️': [Cloud, 'Soft'], '🎚️': [SlidersHorizontal, 'Balance'],
  '✨': [Sparkles, 'Sparkles'], '💞': [HeartHandshake, 'Connection'],
  '🌅': [Sunrise, 'Morning'], '☀️': [Sun, 'Afternoon'], '🌆': [Sunset, 'Evening'],
};

export function symbolLabel(value: string) { return symbols[value]?.[1] ?? 'Personal symbol'; }

export function SymbolIcon({ value, size = 18, className = '' }: { value?: string | null; size?: number; className?: string }) {
  const Icon = symbols[value ?? '']?.[0] ?? Star;
  return <Icon size={size} strokeWidth={1.65} className={`symbol-icon ${className}`} aria-hidden="true" />;
}

export function ProfileAvatar({ value, name, className = '' }: { value: string; name: string; className?: string }) {
  return <span className={`profile-avatar ${className}`} role="img" aria-label={name}><SymbolIcon value={value} size={20} /></span>;
}
