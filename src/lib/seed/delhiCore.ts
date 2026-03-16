import { db } from "@/db/client";
import {
  states,
  constituencies,
  politicians,
  type State,
  type Constituency,
  type Politician
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureDelhiState } from "@/lib/states";

type DelhiAssemblyConstituencySeed = {
  name: string;
};

type DelhiMLASeed = {
  name: string;
  party: string;
  constituencyName: string;
  mynetaUrl: string;
  criminalCases: number;
  assetsWorth: bigint;
};

type DelhiMPSeed = {
  name: string;
  party: string;
  lokSabhaName: string;
  mynetaUrl: string;
};

export const DELHI_ASSEMBLY_CONSTITUENCIES: DelhiAssemblyConstituencySeed[] = [
  { name: "Adarsh Nagar" },
  { name: "Ambedkar Nagar" },
  { name: "Babarpur" },
  { name: "Badarpur" },
  { name: "Badli" },
  { name: "Ballimaran" },
  { name: "Bawana" },
  { name: "Bijwasan" },
  { name: "Burari" },
  { name: "Chandni Chowk" },
  { name: "Chhatarpur" },
  { name: "Delhi Cantonment" },
  { name: "Deoli" },
  { name: "Dwarka" },
  { name: "Gandhi Nagar" },
  { name: "Ghonda" },
  { name: "Gokalpur" },
  { name: "Greater Kailash" },
  { name: "Hari Nagar" },
  { name: "Janakpuri" },
  { name: "Jangpura" },
  { name: "Kalkaji" },
  { name: "Karawal Nagar" },
  { name: "Karol Bagh" },
  { name: "Kasturba Nagar" },
  { name: "Kirari" },
  { name: "Kondli" },
  { name: "Krishna Nagar" },
  { name: "Laxmi Nagar" },
  { name: "Madipur" },
  { name: "Malviya Nagar" },
  { name: "Mangolpuri" },
  { name: "Matia Mahal" },
  { name: "Matiala" },
  { name: "Mehrauli" },
  { name: "Model Town" },
  { name: "Moti Nagar" },
  { name: "Mundka" },
  { name: "Mustafabad" },
  { name: "Najafgarh" },
  { name: "Nangloi Jat" },
  { name: "Narela" },
  { name: "New Delhi" },
  { name: "Okhla" },
  { name: "Palam" },
  { name: "Patel Nagar" },
  { name: "Patparganj" },
  { name: "R. K. Puram" },
  { name: "Rajinder Nagar" },
  { name: "Rajouri Garden" },
  { name: "Rithala" },
  { name: "Rohini" },
  { name: "Rohtas Nagar" },
  { name: "Sadar Bazar" },
  { name: "Sangam Vihar" },
  { name: "Seelampur" },
  { name: "Seemapuri" },
  { name: "Shahdara" },
  { name: "Shakur Basti" },
  { name: "Shalimar Bagh" },
  { name: "Sultan Pur Majra" },
  { name: "Tilak Nagar" },
  { name: "Timarpur" },
  { name: "Tri Nagar" },
  { name: "Trilokpuri" },
  { name: "Tughlakabad" },
  { name: "Uttam Nagar" },
  { name: "Vikaspuri" },
  { name: "Vishwas Nagar" },
  { name: "Wazirpur" },
];

export const DELHI_MLAS: DelhiMLASeed[] = [
  { name: "Raj Karan Khatri", party: "BJP", constituencyName: "Narela", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=1", criminalCases: 0, assetsWorth: BigInt(100000000) },
  { name: "Sanjeev Jha", party: "AAP", constituencyName: "Burari", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=2", criminalCases: 2, assetsWorth: BigInt(1400000) },
  { name: "Surya Prakash Khatri", party: "BJP", constituencyName: "Timarpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=3", criminalCases: 0, assetsWorth: BigInt(0) },
  { name: "Raj Kumar Bhatia", party: "BJP", constituencyName: "Adarsh Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=4", criminalCases: 1, assetsWorth: BigInt(160000000) },
  { name: "Aahir Deepak Chaudhary", party: "BJP", constituencyName: "Badli", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=5", criminalCases: 0, assetsWorth: BigInt(10000000) },
  { name: "Kulwant Rana", party: "BJP", constituencyName: "Rithala", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=6", criminalCases: 3, assetsWorth: BigInt(700000000) },
  { name: "Ravinder Indraj Singh", party: "BJP", constituencyName: "Bawana", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=7", criminalCases: 0, assetsWorth: BigInt(70000000) },
  { name: "Gajender Drall", party: "BJP", constituencyName: "Mundka", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=8", criminalCases: 0, assetsWorth: BigInt(120000000) },
  { name: "Anil Jha", party: "AAP", constituencyName: "Kirari", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=9", criminalCases: 3, assetsWorth: BigInt(40000000) },
  { name: "Mukesh Kumar Ahlawat", party: "AAP", constituencyName: "Sultan Pur Majra", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=10", criminalCases: 4, assetsWorth: BigInt(110000000) },
  { name: "Manoj Kumar Shokeen", party: "BJP", constituencyName: "Nangloi Jat", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=11", criminalCases: 0, assetsWorth: BigInt(130000000) },
  { name: "Raj Kumar Chauhan", party: "BJP", constituencyName: "Mangolpuri", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=12", criminalCases: 0, assetsWorth: BigInt(110000000) },
  { name: "Vijender Gupta", party: "BJP", constituencyName: "Rohini", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=13", criminalCases: 4, assetsWorth: BigInt(160000000) },
  { name: "Rekha Gupta", party: "BJP", constituencyName: "Shalimar Bagh", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=14", criminalCases: 0, assetsWorth: BigInt(50000000) },
  { name: "Karnail Singh", party: "BJP", constituencyName: "Shakur Basti", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=15", criminalCases: 0, assetsWorth: BigInt(2590000000) },
  { name: "Tilak Ram Gupta", party: "BJP", constituencyName: "Tri Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=16", criminalCases: 0, assetsWorth: BigInt(20000000) },
  { name: "Poonam Sharma", party: "BJP", constituencyName: "Wazirpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=17", criminalCases: 0, assetsWorth: BigInt(10000000) },
  { name: "Ashok Goel", party: "BJP", constituencyName: "Model Town", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=18", criminalCases: 0, assetsWorth: BigInt(260000000) },
  { name: "Som Dutt", party: "AAP", constituencyName: "Sadar Bazar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=19", criminalCases: 1, assetsWorth: BigInt(2100000) },
  { name: "Punardeep Singh Sawhney", party: "AAP", constituencyName: "Chandni Chowk", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=20", criminalCases: 1, assetsWorth: BigInt(210000000) },
  { name: "Aaley Mohammad Iqbal", party: "AAP", constituencyName: "Matia Mahal", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=21", criminalCases: 1, assetsWorth: BigInt(10000000) },
  { name: "Imran Hussain", party: "AAP", constituencyName: "Ballimaran", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=22", criminalCases: 0, assetsWorth: BigInt(30000000) },
  { name: "Vishesh Ravi", party: "AAP", constituencyName: "Karol Bagh", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=23", criminalCases: 1, assetsWorth: BigInt(4099999) },
  { name: "Pravesh Ratn", party: "AAP", constituencyName: "Patel Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=24", criminalCases: 0, assetsWorth: BigInt(10000000) },
  { name: "Harish Khurana", party: "BJP", constituencyName: "Moti Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=25", criminalCases: 1, assetsWorth: BigInt(20000000) },
  { name: "Kailash Gangwal", party: "BJP", constituencyName: "Madipur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=26", criminalCases: 0, assetsWorth: BigInt(0) },
  { name: "Manjinder Singh Sirsa", party: "BJP", constituencyName: "Rajouri Garden", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=27", criminalCases: 5, assetsWorth: BigInt(2480000000) },
  { name: "Shyam Sharma", party: "BJP", constituencyName: "Hari Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=28", criminalCases: 0, assetsWorth: BigInt(160000000) },
  { name: "Jarnail Singh", party: "AAP", constituencyName: "Tilak Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=29", criminalCases: 4, assetsWorth: BigInt(40000000) },
  { name: "Ashish Sood", party: "BJP", constituencyName: "Janakpuri", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=30", criminalCases: 1, assetsWorth: BigInt(90000000) },
  { name: "Pankaj Kumar Singh", party: "BJP", constituencyName: "Vikaspuri", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=31", criminalCases: 1, assetsWorth: BigInt(40000000) },
  { name: "Pawan Sharma", party: "BJP", constituencyName: "Uttam Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=32", criminalCases: 0, assetsWorth: BigInt(60000000) },
  { name: "Pradyumn Singh Rajput", party: "BJP", constituencyName: "Dwarka", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=33", criminalCases: 2, assetsWorth: BigInt(420000000) },
  { name: "Sandeep Sehrawat", party: "BJP", constituencyName: "Matiala", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=34", criminalCases: 2, assetsWorth: BigInt(10000000) },
  { name: "Neelam Pahalwan", party: "BJP", constituencyName: "Najafgarh", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=35", criminalCases: 0, assetsWorth: BigInt(120000000) },
  { name: "Kailash Gahlot", party: "BJP", constituencyName: "Bijwasan", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=36", criminalCases: 0, assetsWorth: BigInt(590000000) },
  { name: "Kuldeep Solanki", party: "BJP", constituencyName: "Palam", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=37", criminalCases: 1, assetsWorth: BigInt(130000000) },
  { name: "Virender Singh Kadian", party: "AAP", constituencyName: "Delhi Cantonment", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=38", criminalCases: 2, assetsWorth: BigInt(0) },
  { name: "Umang Bajaj", party: "BJP", constituencyName: "Rajinder Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=39", criminalCases: 0, assetsWorth: BigInt(100000000) },
  { name: "Parvesh Sahib Singh Verma", party: "BJP", constituencyName: "New Delhi", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=40", criminalCases: 1, assetsWorth: BigInt(1150000000) },
  { name: "Tarvinder Singh Marwah", party: "BJP", constituencyName: "Jangpura", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=41", criminalCases: 1, assetsWorth: BigInt(490000000) },
  { name: "Neeraj Basoya", party: "BJP", constituencyName: "Kasturba Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=42", criminalCases: 0, assetsWorth: BigInt(70000000) },
  { name: "Satish Upadhyay", party: "BJP", constituencyName: "Malviya Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=43", criminalCases: 0, assetsWorth: BigInt(130000000) },
  { name: "Anil Kumar Sharma", party: "BJP", constituencyName: "R. K. Puram", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=44", criminalCases: 0, assetsWorth: BigInt(70000000) },
  { name: "Gajender Singh Yadav", party: "BJP", constituencyName: "Mehrauli", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=45", criminalCases: 0, assetsWorth: BigInt(300000000) },
  { name: "Kartar Singh Tanwar", party: "BJP", constituencyName: "Chhatarpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=46", criminalCases: 0, assetsWorth: BigInt(250000000) },
  { name: "Prem Chauhan", party: "AAP", constituencyName: "Deoli", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=47", criminalCases: 0, assetsWorth: BigInt(1600000) },
  { name: "Dr. Ajay Dutt", party: "AAP", constituencyName: "Ambedkar Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=48", criminalCases: 0, assetsWorth: BigInt(110000000) },
  { name: "Chandan Kumar Choudhary", party: "BJP", constituencyName: "Sangam Vihar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=49", criminalCases: 5, assetsWorth: BigInt(30000000) },
  { name: "Shikha Roy", party: "BJP", constituencyName: "Greater Kailash", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=50", criminalCases: 0, assetsWorth: BigInt(160000000) },
  { name: "Atishi Marlena", party: "AAP", constituencyName: "Kalkaji", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=51", criminalCases: 4, assetsWorth: BigInt(7600000) },
  { name: "Sahi Ram", party: "AAP", constituencyName: "Tughlakabad", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=52", criminalCases: 2, assetsWorth: BigInt(0) },
  { name: "Ram Singh Netaji", party: "AAP", constituencyName: "Badarpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=53", criminalCases: 0, assetsWorth: BigInt(890000000) },
  { name: "Amanatullah Khan", party: "AAP", constituencyName: "Okhla", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=54", criminalCases: 19, assetsWorth: BigInt(10000000) },
  { name: "Ravi Kant Ujjain", party: "BJP", constituencyName: "Trilokpuri", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=55", criminalCases: 0, assetsWorth: BigInt(2000000) },
  { name: "Kuldeep Kumar", party: "AAP", constituencyName: "Kondli", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=56", criminalCases: 7, assetsWorth: BigInt(5300000) },
  { name: "Ravinder Singh Negi", party: "BJP", constituencyName: "Patparganj", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=57", criminalCases: 0, assetsWorth: BigInt(10000000) },
  { name: "Abhay Kumar Verma", party: "BJP", constituencyName: "Laxmi Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=58", criminalCases: 1, assetsWorth: BigInt(10000000) },
  { name: "Om Prakash Sharma", party: "BJP", constituencyName: "Vishwas Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=59", criminalCases: 0, assetsWorth: BigInt(250000000) },
  { name: "Dr. Anil Goyal", party: "BJP", constituencyName: "Krishna Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=60", criminalCases: 0, assetsWorth: BigInt(780000000) },
  { name: "Arvinder Singh Lovely", party: "BJP", constituencyName: "Gandhi Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=61", criminalCases: 0, assetsWorth: BigInt(110000000) },
  { name: "Sanjay Goyal", party: "BJP", constituencyName: "Shahdara", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=62", criminalCases: 0, assetsWorth: BigInt(540000000) },
  { name: "Veer Singh Dhingan", party: "AAP", constituencyName: "Seemapuri", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=63", criminalCases: 0, assetsWorth: BigInt(5800000) },
  { name: "Jitender Mahajan", party: "BJP", constituencyName: "Rohtas Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=64", criminalCases: 3, assetsWorth: BigInt(20000000) },
  { name: "Chaudhary Zubair Ahmad", party: "AAP", constituencyName: "Seelampur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=65", criminalCases: 0, assetsWorth: BigInt(30000000) },
  { name: "Ajay Mahawar", party: "BJP", constituencyName: "Ghonda", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=66", criminalCases: 0, assetsWorth: BigInt(70000000) },
  { name: "Gopal Rai", party: "AAP", constituencyName: "Babarpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=67", criminalCases: 1, assetsWorth: BigInt(10000000) },
  { name: "Surendra Kumar", party: "AAP", constituencyName: "Gokalpur", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=68", criminalCases: 1, assetsWorth: BigInt(40000000) },
  { name: "Mohan Singh Bisht", party: "BJP", constituencyName: "Mustafabad", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=69", criminalCases: 0, assetsWorth: BigInt(70000000) },
  { name: "Kapil Mishra", party: "BJP", constituencyName: "Karawal Nagar", mynetaUrl: "https://www.myneta.info/Delhi2025/candidate.php?candidate_id=70", criminalCases: 3, assetsWorth: BigInt(10000000) },
];

export const DELHI_MPS: DelhiMPSeed[] = [
  { name: "Praveen Khandelwal", party: "BJP", lokSabhaName: "Chandni Chowk", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=912" },
  { name: "Bansuri Swaraj", party: "BJP", lokSabhaName: "New Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=913" },
  { name: "Kamaljeet Sehrawat", party: "BJP", lokSabhaName: "West Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=914" },
  { name: "Harsh Malhotra", party: "BJP", lokSabhaName: "East Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=915" },
  { name: "Ramvir Singh Bidhuri", party: "BJP", lokSabhaName: "South Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=916" },
  { name: "Yogender Chandolia", party: "BJP", lokSabhaName: "North West Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=917" },
  { name: "Manoj Tiwari", party: "BJP", lokSabhaName: "North East Delhi", mynetaUrl: "https://www.myneta.info/LokSabha2024/candidate.php?candidate_id=918" },
];

async function upsertConstituency(
  state: State,
  payload: DelhiAssemblyConstituencySeed,
  typeValue: "vidhan_sabha" | "lok_sabha"
): Promise<Constituency> {
  const existing = await db
    .select()
    .from(constituencies)
    .where(
      and(
        eq(constituencies.state_id, state.id),
        eq(constituencies.type, typeValue),
        eq(constituencies.name, payload.name)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(constituencies)
    .values({
      state_id: state.id,
      type: typeValue,
      name: payload.name
    })
    .returning();

  return inserted[0];
}

async function upsertPolitician(
  state: State,
  attrs: {
    name: string;
    position: "MLA" | "MP";
    party: string;
    constituencyId: number;
    mynetaUrl: string;
    criminalCases?: number;
    assetsWorth?: bigint;
  }
): Promise<Politician> {
  const existing = await db
    .select()
    .from(politicians)
    .where(
      and(
        eq(politicians.state_id, state.id),
        eq(politicians.position, attrs.position),
        eq(politicians.name, attrs.name),
        eq(politicians.constituency_id, attrs.constituencyId)
      )
    )
    .limit(1);

  const criminalCases = attrs.criminalCases ?? 0;
  const assetsWorth = attrs.assetsWorth ?? BigInt(0);

  if (existing.length > 0) {
    const updated = await db
      .update(politicians)
      .set({
        party: attrs.party,
        myneta_url: attrs.mynetaUrl,
        criminal_cases: criminalCases,
        assets_worth: assetsWorth
      })
      .where(eq(politicians.id, existing[0].id))
      .returning();

    return updated[0];
  }

  const inserted = await db
    .insert(politicians)
    .values({
      state_id: state.id,
      name: attrs.name,
      slug: attrs.name.toLowerCase().replace(/\s+/g, "-"),
      position: attrs.position,
      party: attrs.party,
      constituency_id: attrs.constituencyId,
      myneta_url: attrs.mynetaUrl,
      criminal_cases: criminalCases,
      assets_worth: assetsWorth
    })
    .returning();

  return inserted[0];
}

export async function seedDelhiCore(): Promise<void> {
  const delhi = await ensureDelhiState();

  for (const ac of DELHI_ASSEMBLY_CONSTITUENCIES) {
    await upsertConstituency(delhi, ac, "vidhan_sabha");
  }

  for (const mla of DELHI_MLAS) {
    const constituenciesRows = await db
      .select()
      .from(constituencies)
      .where(
        and(
          eq(constituencies.state_id, delhi.id),
          eq(constituencies.type, "vidhan_sabha"),
          eq(constituencies.name, mla.constituencyName)
        )
      )
      .limit(1);

    const constituency = constituenciesRows[0];

    if (!constituency) {
      console.warn(
        "Skipping MLA because constituency not found",
        mla.name,
        mla.constituencyName
      );
      continue;
    }

    await upsertPolitician(delhi, {
      name: mla.name,
      position: "MLA",
      party: mla.party,
      constituencyId: constituency.id,
      mynetaUrl: mla.mynetaUrl,
      criminalCases: mla.criminalCases,
      assetsWorth: mla.assetsWorth
    });
  }

  for (const mp of DELHI_MPS) {
    const lokSabhaConstituency = await upsertConstituency(
      delhi,
      { name: mp.lokSabhaName },
      "lok_sabha"
    );

    await upsertPolitician(delhi, {
      name: mp.name,
      position: "MP",
      party: mp.party,
      constituencyId: lokSabhaConstituency.id,
      mynetaUrl: mp.mynetaUrl
    });
  }
}
