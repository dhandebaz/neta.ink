import { db } from "@/db/client";
import {
  states,
  constituencies,
  politicians,
  type Politician
} from "@/db/schema";
import { and, asc, eq, ilike } from "drizzle-orm";

export type DelhiConstituencyInfo = {
  lokSabhaName: string | null;
  vidhanSabhaName: string | null;
};

const DELHI_LOCALITY_MAP: Record<string, string> = {
  "connaught place": "New Delhi",
  cp: "New Delhi",
  "rajiv chowk": "New Delhi",
  "karol bagh": "Sadar Bazaar",
  "chandni chowk": "Chandni Chowk",
  "chawri bazaar": "Matia Mahal",
  "jama masjid": "Matia Mahal",
  daryaganj: "Matia Mahal",
  paharganj: "Sadar Bazaar",
  "darya ganj": "Ballimaran",
  "civil lines": "Model Town",
  "kingsway camp": "Model Town",
  "north campus": "Model Town",
  "delhi university": "Model Town",
  "hudson lane": "Model Town",
  "kamla nagar": "Kamla Nagar",
  "shakti nagar": "Kamla Nagar",
  "gujranwala town": "Kamla Nagar",
  "model town": "Model Town",
  "derawal nagar": "Model Town",
  azadpur: "Adarsh Nagar",
  "adarsh nagar": "Adarsh Nagar",
  "keshav puram": "Shakur Basti",
  "lawrence road": "Shakur Basti",
  shakurpur: "Shakur Basti",
  "punjabi bagh": "Shakur Basti",
  "paschim vihar": "Madipur",
  madipur: "Madipur",
  "tilak nagar": "Tilak Nagar",
  janakpuri: "Janakpuri",
  vikaspuri: "Vikaspuri",
  "uttam nagar": "Uttam Nagar",
  "mohan garden": "Uttam Nagar",
  dwarka: "Dwarka",
  matiala: "Matiala",
  najafgarh: "Najafgarh",
  "rajouri garden": "Rajouri Garden",
  "ramesh nagar": "Rajouri Garden",
  "kirti nagar": "Rajouri Garden",
  "moti nagar": "Moti Nagar",
  "patel nagar": "Patel Nagar",
  "ranjit nagar": "Patel Nagar",
  "karol bagh east": "Sadar Bazaar",
  naraina: "Delhi Cantt",
  "delhi cantt": "Delhi Cantt",
  "dhaula kuan": "Delhi Cantt",
  "vasant kunj": "Mehrauli",
  "vasant vihar": "Mehrauli",
  "rk puram": "Mehrauli",
  munirka: "Mehrauli",
  mehrauli: "Mehrauli",
  ladosarai: "Mehrauli",
  saket: "Mehrauli",
  "malviya nagar": "Malviya Nagar",
  "hauz khas": "Hauz Khas",
  "green park": "Hauz Khas",
  "safdarjung enclave": "Safdarjung Enclave",
  "south extension": "Kasturba Nagar",
  "defence colony": "Defence Colony",
  "lajpat nagar": "Lajpat Nagar",
  jungpura: "Jangpura",
  "mathura road": "Jangpura",
  nizamuddin: "Jangpura",
  ashram: "Jangpura",
  "greater kailash": "Greater Kailash",
  gk: "Greater Kailash",
  "kailash colony": "Greater Kailash",
  "chittaranjan park": "Kalkaji",
  kalkaji: "Kalkaji",
  okhla: "Okhla",
  "jamia nagar": "Okhla",
  "sarita vihar": "Okhla",
  jasola: "Okhla",
  "nehru place": "Kalkaji",
  govindpuri: "Kalkaji",
  "sangam vihar": "Sangam Vihar",
  "ambedkar nagar": "Ambedkar Nagar",
  khanpur: "Ambedkar Nagar",
  deoli: "Deoli",
  "pul pehladpur": "Pul Prahladpur",
  tughlakabad: "Tughlakabad",
  badarpur: "Badarpur",
  molarband: "Badarpur",
  "jasola vihar": "Okhla",
  "paharganj east": "Paharganj",
  dariba: "Chandni Chowk",
  "laxmi nagar": "Laxmi Nagar",
  "preet vihar": "Laxmi Nagar",
  "nirman vihar": "Laxmi Nagar",
  shakarpur: "Laxmi Nagar",
  "mayur vihar": "Trilokpuri",
  patparganj: "Trilokpuri",
  "pandav nagar": "Laxmi Nagar",
  "geeta colony": "Geeta Colony",
  "preet vihar extension": "Geeta Colony",
  "gandhi nagar": "Gandhi Nagar",
  "krishna nagar": "Krishna Nagar",
  "preatm nagar": "Krishna Nagar",
  shahdara: "Shahdara",
  jhilmil: "Jhilmil",
  "mansarovar park": "Jhilmil",
  "vivek vihar": "Jhilmil",
  vivekanandpuri: "Jhilmil",
  "anand vihar": "Vishnu Garden",
  kaushambi: "Vishnu Garden",
  vaishali: "Vishnu Garden",
  "dilshad garden": "Jhilmil",
  seemapuri: "Seemapuri",
  dallupura: "Seemapuri",
  "new ashok nagar": "Trilokpuri",
  kondli: "Kondli",
  "mayur vihar phase 3": "Kondli",
  trilokpuri: "Trilokpuri",
  kalyanvas: "Trilokpuri",
  seelampur: "Seelampur",
  jafrabad: "Seelampur",
  welcome: "Seelampur",
  gokulpuri: "Gokalpur",
  bhajanpura: "Gokalpur",
  "karawal nagar": "Karawal Nagar",
  "khajuri khas": "Karawal Nagar",
  mustafabad: "Mustafabad",
  dayalpur: "Mustafabad",
  "nand nagri": "Mustafabad",
  babarpur: "Babarpur",
  "shiv vihar": "Babarpur",
  maujpur: "Babarpur",
  "yamuna vihar": "Yamuna Vihar",
  gokalpur: "Gokalpur",
  narela: "Narela",
  alipur: "Narela",
  bawana: "Bawana",
  "narela industrial area": "Narela",
  "holambi kalan": "Bawana",
  bijwasan: "Bijwasan",
  kapashera: "Bijwasan",
  mahipalpur: "Bijwasan",
  burari: "Burari",
  "sant nagar": "Burari",
  "swaroop nagar": "Burari",
  nathupura: "Burari",
  "shahbad dairy": "Bawana",
  nangloi: "Nangloi Jat",
  "sultanpur majra": "Sultanpur Majra",
  mangolpuri: "Mangol Puri",
  peeragarhi: "Mangol Puri",
  "rohtak road": "Mangol Puri",
  mundka: "Nangloi Jat",
  "dichau kalan": "Najafgarh",
  "qutub vihar": "Najafgarh",
  chhawla: "Najafgarh",
  "mahavir enclave": "Dwarka",
  palam: "Palam",
  "mahipalpur extension": "Palam",
  "vasant gaon": "Mehrauli",
  "andheria mor": "Mehrauli",
  "katwaria sarai": "Hauz Khas",
  "ber sarai": "Hauz Khas",
  adchini: "Hauz Khas",
  "shahpur jat": "Hauz Khas",
  "sainik farm": "Mehrauli",
  "pushp vihar": "Sangam Vihar",
  madangir: "Ambedkar Nagar",
  khirki: "Kalkaji",
  "sarvapriya vihar": "Hauz Khas"
};

const DELHI_LOK_SABHA_MAP: Record<string, string[]> = {
  "Chandni Chowk": [
    "Chandni Chowk",
    "Matia Mahal",
    "Ballimaran",
    "Karol Bagh",
    "Sadar Bazaar"
  ],
  "North East Delhi": [
    "Seelampur",
    "Gokalpur",
    "Karawal Nagar",
    "Mustafabad",
    "Babarpur",
    "Yamuna Vihar"
  ],
  "East Delhi": [
    "Laxmi Nagar",
    "Geeta Colony",
    "Krishna Nagar",
    "Gandhi Nagar",
    "Shahdara",
    "Jhilmil",
    "Vishnu Garden",
    "Trilokpuri",
    "Kondli"
  ],
  "New Delhi": [
    "New Delhi",
    "Sadar Bazaar",
    "Patel Nagar",
    "Moti Nagar",
    "Rajouri Garden",
    "Kasturba Nagar",
    "Defence Colony",
    "Lajpat Nagar",
    "Jangpura"
  ],
  "North West Delhi": [
    "Model Town",
    "Adarsh Nagar",
    "Shakur Basti",
    "Kamla Nagar",
    "Burari",
    "Bawana",
    "Narela",
    "Nangloi Jat",
    "Sultanpur Majra",
    "Mangol Puri"
  ],
  "West Delhi": [
    "Madipur",
    "Tilak Nagar",
    "Janakpuri",
    "Vikaspuri",
    "Uttam Nagar",
    "Matiala",
    "Najafgarh",
    "Dwarka",
    "Palam",
    "Delhi Cantt"
  ],
  "South Delhi": [
    "Mehrauli",
    "Malviya Nagar",
    "Hauz Khas",
    "Safdarjung Enclave",
    "Greater Kailash",
    "Kalkaji",
    "Okhla",
    "Sangam Vihar",
    "Ambedkar Nagar",
    "Deoli",
    "Pul Prahladpur",
    "Tughlakabad",
    "Badarpur"
  ]
};

export async function resolveDelhiConstituenciesForLocality(
  locality: string
): Promise<DelhiConstituencyInfo> {
  if (!locality.trim()) {
    return { lokSabhaName: null, vidhanSabhaName: null };
  }

  const normalized = locality.toLowerCase().trim();
  const vidhanSabhaName = DELHI_LOCALITY_MAP[normalized] ?? null;

  let lokSabhaName: string | null = null;
  if (vidhanSabhaName) {
    for (const [lokSabha, assemblies] of Object.entries(DELHI_LOK_SABHA_MAP)) {
      if (assemblies.includes(vidhanSabhaName)) {
        lokSabhaName = lokSabha;
        break;
      }
    }
  }

  return { lokSabhaName, vidhanSabhaName };
}

export type DelhiRepsByConstituency = {
  constituencyName: string | null;
  mp: Politician | null;
  mla: Politician | null;
};

export async function getDelhiRepsByConstituencySearch(
  search: string
): Promise<DelhiRepsByConstituency> {
  const trimmed = search.trim();

  if (!trimmed) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (!delhi) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const { vidhanSabhaName } = await resolveDelhiConstituenciesForLocality(trimmed);
  if (vidhanSabhaName) {
    const [ac] = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          eq(constituencies.name, vidhanSabhaName)
        )
      )
      .limit(1);

    if (ac) {
      const [mlaRow] = await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.state_id, delhi.id),
            eq(politicians.position, "MLA"),
            eq(politicians.constituency_id, ac.id)
          )
        )
        .limit(1);

      let mpRow: Politician | null = null;
      for (const [lokSabha, assemblies] of Object.entries(DELHI_LOK_SABHA_MAP)) {
        if (!assemblies.includes(vidhanSabhaName)) continue;

        const [ls] = await db
          .select()
          .from(constituencies)
          .where(
            and(
              eq(constituencies.state_id, delhi.id),
              eq(constituencies.type, "lok_sabha"),
              eq(constituencies.name, lokSabha)
            )
          )
          .limit(1);

        if (ls) {
          const [mp] = await db
            .select()
            .from(politicians)
            .where(
              and(
                eq(politicians.state_id, delhi.id),
                eq(politicians.position, "MP"),
                eq(politicians.constituency_id, ls.id)
              )
            )
            .limit(1);
          mpRow = mp ?? null;
        }

        break;
      }

      return {
        constituencyName: ac.name,
        mla: mlaRow ?? null,
        mp: mpRow
      };
    }
  }

  const acRows = await db
    .select()
    .from(constituencies)
    .where(
      and(
        eq(constituencies.state_id, delhi.id),
        eq(constituencies.type, "vidhan_sabha"),
        ilike(constituencies.name, `%${trimmed}%`)
      )
    )
    .orderBy(asc(constituencies.name))
    .limit(1);

  const ac = acRows[0];

  if (!ac) {
    return {
      constituencyName: null,
      mp: null,
      mla: null
    };
  }

  const constituencyName = ac.name;

  const [mlaRow] = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, delhi.id),
        eq(politicians.position, "MLA"),
        eq(politicians.constituency_id, ac.id)
      )
    )
    .limit(1);

  let mpRow: Politician | null = null;
  for (const [lokSabha, assemblies] of Object.entries(DELHI_LOK_SABHA_MAP)) {
    if (!assemblies.includes(constituencyName)) continue;

    const [ls] = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "lok_sabha"),
          eq(constituencies.name, lokSabha)
        )
      )
      .limit(1);

    if (ls) {
      const [mp] = await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.state_id, delhi.id),
            eq(politicians.position, "MP"),
            eq(politicians.constituency_id, ls.id)
          )
        )
        .limit(1);
      mpRow = mp ?? null;
    }

    break;
  }

  return {
    constituencyName,
    mla: mlaRow ?? null,
    mp: mpRow
  };
}

export type DelhiRepsForLocality = {
  lokSabhaName: string | null;
  vidhanSabhaName: string | null;
  mp: Politician | null;
  mla: Politician | null;
};

export async function getDelhiRepsForLocality(
  locality: string
): Promise<DelhiRepsForLocality> {
  const { lokSabhaName, vidhanSabhaName } =
    await resolveDelhiConstituenciesForLocality(locality);

  let mp: Politician | null = null;
  let mla: Politician | null = null;

  const [delhi] = await db
    .select()
    .from(states)
    .where(eq(states.code, "DL"))
    .limit(1);

  if (!delhi) {
    return { lokSabhaName, vidhanSabhaName, mp: null, mla: null };
  }

  if (vidhanSabhaName) {
    const [ac] = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          eq(constituencies.name, vidhanSabhaName)
        )
      )
      .limit(1);

    if (ac) {
      const [mlaRow] = await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.state_id, delhi.id),
            eq(politicians.position, "MLA"),
            eq(politicians.constituency_id, ac.id)
          )
        )
        .limit(1);
      mla = mlaRow ?? null;
    }
  }

  if (lokSabhaName) {
    const [ls] = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "lok_sabha"),
          eq(constituencies.name, lokSabhaName)
        )
      )
      .limit(1);

    if (ls) {
      const [mpRow] = await db
        .select()
        .from(politicians)
        .where(
          and(
            eq(politicians.state_id, delhi.id),
            eq(politicians.position, "MP"),
            eq(politicians.constituency_id, ls.id)
          )
        )
        .limit(1);
      mp = mpRow ?? null;
    }
  }

  return { lokSabhaName, vidhanSabhaName, mp, mla };
}
