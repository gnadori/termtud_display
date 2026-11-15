import type {
  EarthquakeFeature,
  NobelLaureate,
  ProtectedAnimal,
  SpaceWeatherData,
  WeatherData,
} from '../types';

function getDaySeed(): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return y * 10000 + m * 100 + d;
}

function getCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - parsed.ts < maxAgeMs) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore storage quota errors
  }
}

// 1. Földrengések (USGS GeoJSON)
export async function fetchEarthquakes(): Promise<EarthquakeFeature[]> {
  const cacheKey = 'ttd_cache_quakes';
  const cached = getCache<EarthquakeFeature[]>(cacheKey, 10 * 60 * 1000);
  if (cached) return cached;

  const parseGeoJson = (json: any): EarthquakeFeature[] =>
    (json?.features || [])
      .filter((f: any) => f?.geometry?.coordinates?.length >= 2)
      .map((f: any) => ({
        id: String(f.id),
        mag: Number(f.properties?.mag ?? 0),
        place: String(f.properties?.place ?? 'Ismeretlen helyszín'),
        time: Number(f.properties?.time ?? Date.now()),
        lon: Number(f.geometry.coordinates[0]),
        lat: Number(f.geometry.coordinates[1]),
        depth: Number(f.geometry.coordinates[2] ?? 0),
      }))
      .sort((a: EarthquakeFeature, b: EarthquakeFeature) => b.time - a.time);

  try {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
    );
    if (res.ok) {
      const json = await res.json();
      let list = parseGeoJson(json);
      if (list.length < 5) {
        const resWeek = await fetch(
          'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'
        );
        if (resWeek.ok) {
          list = parseGeoJson(await resWeek.json());
        }
      }
      const trimmed = list.slice(0, 60);
      setCache(cacheKey, trimmed);
      return trimmed;
    }
  } catch {
    // fallback below
  }
  return [];
}

// 2. A nap veszélyeztetett / fokozottan védett állata (hu.wikipedia.org)
const FALLBACK_ANIMALS = [
  'Parlagi sas',
  'Rákosi vipera',
  'Túzok',
  'Fekete gólya',
  'Eurázsiai hiúz',
  'Vidra',
  'Kerecsensólyom',
  'Haris',
  'Bölömbika',
];

export async function fetchProtectedAnimalOfDay(): Promise<ProtectedAnimal> {
  const seed = getDaySeed();
  const cacheKey = `ttd_cache_animal_${seed}`;
  const cached = getCache<ProtectedAnimal>(cacheKey, 12 * 60 * 60 * 1000);
  if (cached) return cached;

  let titles: string[] = FALLBACK_ANIMALS;
  try {
    const listUrl =
      'https://hu.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Kateg%C3%B3ria:Magyarorsz%C3%A1gon_fokozottan_v%C3%A9dett_%C3%A1llatok&cmtype=page&cmlimit=500&format=json&origin=*';
    const res = await fetch(listUrl);
    if (res.ok) {
      const data = await res.json();
      const members = (data?.query?.categorymembers || [])
        .map((m: any) => String(m.title))
        .filter((t: string) => !t.startsWith('Kategória:') && !t.includes('listája'));
      if (members.length > 0) {
        titles = members;
      }
    }
  } catch {
    // use fallback titles
  }

  // Determinisztikus napi választás (próbálkozunk max 3 címmel, ha esetleg nincs kép/leírás)
  for (let offset = 0; offset < 3; offset++) {
    const idx = (seed + offset * 7) % titles.length;
    const chosenTitle = titles[idx];
    try {
      const summaryUrl = `https://hu.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        chosenTitle
      )}`;
      const sRes = await fetch(summaryUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        const animal: ProtectedAnimal = {
          title: sData.title || chosenTitle,
          extract:
            sData.extract ||
            'Magyarországon fokozottan védett állatfaj. Természetvédelmi értéke kiemelt jelentőségű.',
          imageUrl: sData.originalimage?.source || sData.thumbnail?.source,
          pageUrl:
            sData.content_urls?.desktop?.page ||
            `https://hu.wikipedia.org/wiki/${encodeURIComponent(chosenTitle)}`,
        };
        if (animal.imageUrl || offset === 2) {
          setCache(cacheKey, animal);
          return animal;
        }
      }
    } catch {
      // try next
    }
  }

  return {
    title: 'Parlagi sas',
    extract:
      'A parlagi sas (Aquila heliaca) Magyarország egyik legértékesebb, fokozottan védett ragadozó madara.',
    pageUrl: 'https://hu.wikipedia.org/wiki/Parlagi_sas',
  };
}

// 3. Időjárás (Open-Meteo)
export async function fetchWeatherData(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  const cacheKey = `ttd_cache_weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = getCache<WeatherData>(cacheKey, 15 * 60 * 1000);
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&timezone=Europe%2FBudapest`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const c = json.current;
      if (c) {
        const data: WeatherData = {
          temperature: Math.round(c.temperature_2m),
          apparentTemperature: Math.round(c.apparent_temperature),
          windSpeed: Math.round(c.wind_speed_10m),
          pressure: Math.round(c.surface_pressure),
          humidity: Math.round(c.relative_humidity_2m),
          weatherCode: Number(c.weather_code ?? 0),
          updatedAt: Date.now(),
        };
        setCache(cacheKey, data);
        return data;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return 'Derült égbolt';
  if (code <= 3) return 'Változóan felhős';
  if (code === 45 || code === 48) return 'Ködös, párás';
  if (code >= 51 && code <= 57) return 'Szitálás';
  if (code >= 61 && code <= 67) return 'Eső';
  if (code >= 71 && code <= 77) return 'Havazás';
  if (code >= 80 && code <= 82) return 'Zápor';
  if (code >= 85 && code <= 86) return 'Hózápor';
  if (code >= 95) return 'Zivatar';
  return 'Változékony idő';
}

// 4. Napfolt- és napszél-tevékenység (NOAA SWPC + NASA SDO)
export async function fetchSpaceWeather(): Promise<SpaceWeatherData> {
  const cacheKey = 'ttd_cache_space_v2';
  const cached = getCache<SpaceWeatherData>(cacheKey, 15 * 60 * 1000);
  if (cached) return cached;

  let kpIndex: number | null = null;
  let solarWindSpeed: number | null = null;
  let bt: number | null = null;
  let bz: number | null = null;

  await Promise.allSettled([
    fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json')
      .then((r) => r.json())
      .then((d) => {
        const item = Array.isArray(d) ? d[d.length - 1] : d;
        const speed = item?.proton_speed ?? item?.WindSpeed;
        if (speed !== undefined && speed !== null && !Number.isNaN(Number(speed))) {
          solarWindSpeed = Math.round(Number(speed));
        }
      }),
    fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json')
      .then((r) => r.json())
      .then((d) => {
        const item = Array.isArray(d) ? d[d.length - 1] : d;
        const btVal = item?.bt ?? item?.Bt;
        const bzVal = item?.bz_gsm ?? item?.Bz;
        if (btVal !== undefined && btVal !== null && !Number.isNaN(Number(btVal))) {
          bt = Number(btVal);
        }
        if (bzVal !== undefined && bzVal !== null && !Number.isNaN(Number(bzVal))) {
          bz = Number(bzVal);
        }
      }),
    fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
      .then((r) => r.json())
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          const last = rows[rows.length - 1];
          const rawKp = Array.isArray(last) ? last[1] : last?.Kp ?? last?.kp;
          const val = Number(rawKp);
          if (!Number.isNaN(val)) kpIndex = val;
        }
      }),
  ]);

  const data: SpaceWeatherData = {
    kpIndex,
    solarWindSpeed,
    bt,
    bz,
    solarImageUrl: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIC.jpg?t=${Math.floor(
      Date.now() / (15 * 60 * 1000)
    )}`,
    updatedAt: Date.now(),
  };

  setCache(cacheKey, data);
  return data;
}

// 5. A nap természettudományi Nobel-díjasa
const FALLBACK_NOBELS: NobelLaureate[] = [
  {
    id: 'kariko',
    name: 'Karikó Katalin',
    year: '2023',
    category: 'Orvostudomány',
    motivation:
      'A nukleozid-bázis módosításokkal kapcsolatos felfedezéseiért, amelyek lehetővé tették a hatékony mRNS-vakcinák kifejlesztését.',
    extract:
      'Magyar származású biokémikus, a szintetikus mRNS-alapú orvoslás úttörője. Munkássága alapjaiban változtatta meg a vakcinafejlesztést.',
  },
  {
    id: 'krausz',
    name: 'Krausz Ferenc',
    year: '2023',
    category: 'Fizika',
    motivation:
      'Az attoszekundumos fényimpulzusokat előállító kísérleti módszerekért, amelyek lehetővé teszik az elektronok dinamikájának vizsgálatát az anyagban.',
    extract:
      'Magyar származású fizikus, az attoszekundumos fizika megalapítója. Segítségével valós időben követhetővé vált az elektronok mozgása.',
  },
  {
    id: 'szentgyorgyi',
    name: 'Szent-Györgyi Albert',
    year: '1937',
    category: 'Orvostudomány',
    motivation:
      'A biológiai égésfolyamatok terén tett felfedezéseiért, különös tekintettel a C-vitaminra és a fumársav-katalízisre.',
    extract:
      'Magyar orvos, biokémikus, aki Szegeden izolálta a C-vitamint (aszkorbinsavat) fűszerpaprikából.',
  },
  {
    id: 'olah',
    name: 'Oláh György',
    year: '1994',
    category: 'Kémia',
    motivation: 'A karbokationok kémiájához való hozzájárulásáért.',
    extract:
      'Magyar származású vegyész, akinek szupersavakkal végzett kutatásai új utat nyitottak a szerves kémiában és a petrolkémiában.',
  },
  {
    id: 'curie',
    name: 'Marie Curie',
    year: '1903 / 1911',
    category: 'Fizika',
    motivation:
      'A radioaktivitás jelenségének kutatásáért, valamint a rádium és a polónium felfedezéséért.',
    extract:
      'Az első nő, aki Nobel-díjat kapott, és az egyetlen tudós, aki két különböző természettudományi területen (fizika és kémia) is elnyerte.',
  },
  {
    id: 'einstein',
    name: 'Albert Einstein',
    year: '1921',
    category: 'Fizika',
    motivation:
      'Az elméleti fizika terén szerzett érdemeiért, különösen a fényelektromos jelenség törvényének felfedezéséért.',
    extract:
      'A modern fizika egyik legmeghatározóbb alakja, a speciális és az általános relativitáselmélet megalkotója.',
  },
];

export async function fetchNobelLaureateOfDay(): Promise<NobelLaureate> {
  const seed = getDaySeed();
  const cacheKey = `ttd_cache_nobel_${seed}`;
  const cached = getCache<NobelLaureate>(cacheKey, 12 * 60 * 60 * 1000);
  if (cached) return cached;

  const categories: Array<{ code: 'phy' | 'che' | 'med'; label: NobelLaureate['category'] }> = [
    { code: 'phy', label: 'Fizika' },
    { code: 'che', label: 'Kémia' },
    { code: 'med', label: 'Orvostudomány' },
  ];
  const chosenCat = categories[seed % categories.length];

  try {
    const res = await fetch(
      `https://api.nobelprize.org/2.1/laureates?nobelPrizeCategory=${chosenCat.code}&limit=100`
    );
    if (res.ok) {
      const json = await res.json();
      const laureates = (json?.laureates || []).filter(
        (l: any) => l?.knownName?.en && l?.nobelPrizes?.length > 0
      );
      if (laureates.length > 0) {
        const picked = laureates[seed % laureates.length];
        const name = String(picked.knownName.en);
        const prize =
          picked.nobelPrizes.find((p: any) => p.category?.en) || picked.nobelPrizes[0];
        const year = String(prize?.awardYear ?? '');
        const motivation = String(prize?.motivation?.en ?? '');

        let imageUrl: string | undefined;
        let extract: string | undefined;
        let wikiUrl: string | undefined;

        // Próbáljuk meg a magyar, majd az angol Wikipédiáról lekérni a képet és a rövid leírást
        for (const lang of ['hu', 'en']) {
          try {
            const wRes = await fetch(
              `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
                name
              )}`
            );
            if (wRes.ok) {
              const wData = await wRes.json();
              if (!imageUrl && (wData.originalimage?.source || wData.thumbnail?.source)) {
                imageUrl = wData.originalimage?.source || wData.thumbnail?.source;
              }
              if (lang === 'hu' && wData.extract) {
                extract = wData.extract;
                wikiUrl = wData.content_urls?.desktop?.page;
              } else if (!extract && wData.extract) {
                extract = wData.extract;
                wikiUrl = wData.content_urls?.desktop?.page;
              }
            }
          } catch {
            // ignore
          }
        }

        const result: NobelLaureate = {
          id: String(picked.id),
          name,
          year,
          category: chosenCat.label,
          motivation,
          extract,
          imageUrl,
          wikiUrl,
        };
        setCache(cacheKey, result);
        return result;
      }
    }
  } catch {
    // fallback below
  }

  const fb = FALLBACK_NOBELS[seed % FALLBACK_NOBELS.length];
  // Enrich fallback with Hungarian Wikipedia image if possible
  try {
    const wRes = await fetch(
      `https://hu.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(fb.name)}`
    );
    if (wRes.ok) {
      const wData = await wRes.json();
      const enriched: NobelLaureate = {
        ...fb,
        imageUrl: wData.originalimage?.source || wData.thumbnail?.source,
        wikiUrl: wData.content_urls?.desktop?.page,
      };
      setCache(cacheKey, enriched);
      return enriched;
    }
  } catch {
    // ignore
  }
  return fb;
}
