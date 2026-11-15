export type AnnouncementPriority = 'normal' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type EventCategory =
  | 'termeszettudomany'
  | 'fizika'
  | 'kemia'
  | 'biologia'
  | 'foldrajz'
  | 'verseny'
  | 'egyeb';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  category: EventCategory;
  description?: string;
  createdAt: number;
}

export interface FunFact {
  id: string;
  text: string;
  category: string;
  source?: string;
  active: boolean;
  createdAt: number;
}

export type CarouselSlideId =
  | 'earthquake'
  | 'animal'
  | 'weather'
  | 'space'
  | 'nobel'
  | 'funfact';

export interface DisplaySettings {
  carouselIntervalSeconds: number; // 30 - 60
  enabledSlides: CarouselSlideId[];
  weatherFrontMapUrl: string;
  latitude: number;
  longitude: number;
  locationName: string;
  schoolTitle: string;
  sleepEnabled: boolean;
  sleepStart: string; // HH:mm
  sleepEnd: string; // HH:mm
  sleepWeekends: boolean;
}

export interface EarthquakeFeature {
  id: string;
  mag: number;
  place: string;
  time: number;
  lon: number;
  lat: number;
  depth: number;
}

export interface ProtectedAnimal {
  title: string;
  extract: string;
  imageUrl?: string;
  pageUrl: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  pressure: number;
  humidity: number;
  weatherCode: number;
  updatedAt: number;
}

export interface SpaceWeatherData {
  kpIndex: number | null;
  solarWindSpeed: number | null;
  bt: number | null;
  bz: number | null;
  solarImageUrl: string;
  updatedAt: number;
}

export interface NobelLaureate {
  id: string;
  name: string;
  year: string;
  category: 'Fizika' | 'Kémia' | 'Orvostudomány';
  motivation: string;
  extract?: string;
  imageUrl?: string;
  wikiUrl?: string;
}
