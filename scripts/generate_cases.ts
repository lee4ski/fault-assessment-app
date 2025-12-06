
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { AssessmentCriteria } from '../types';

// Load env
dotenv.config({ path: '.env.local' });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 5; // Generate 5 at a time to avoid timeouts
const TARGET_COUNT = 20;

const SYSTEM_PROMPT = `You are an expert in Japanese traffic accident liability (Hanrei Times). 
Generate realistic assessment criteria for traffic accidents.
Each criteria must follow this JSON structure exactly:
{
  "id": "unique-string-id",
  "chapter": number, (1: Intersection, 2: Parking, 3: Highway, 4: Pedestrian, 5: Other)
  "chapterTitle": "String",
  "title": "String (e.g. [123] Vehicle A turning right vs Vehicle B straight)",
  "description": "Detailed situation description",
  "summary": "Concise summary including base fault percentage",
  "baseFaultPercentage": number (0-100),
  "pageNumber": number,
  "sourceBook": "別冊判例タイムズ",
  "sourceEdition": "第38号",
  "modificationFactors": [
    {
      "id": "mod-id",
      "description": "Modification factor description",
      "adjustment": number (negative or positive integer),
      "category": "vehicle" | "pedestrian" | "road" | "signal"
    }
  ]
}

Generate varied cases covering:
- Intersections (Signalized/Unsignalized)
- Lane changes
- Head-on collisions
- Pedestrian accidents
- Parking lot accidents
- Highway accidents
- Bicycle accidents

Ensure Japanese text is natural and professional.`;

async function generateBatch(count: number, existingIds: Set<string>): Promise<AssessmentCriteria[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Generate ${count} unique traffic accident criteria. Ensure IDs are unique and not in: ${Array.from(existingIds).slice(0, 20).join(', ')}...` }
    ],
    response_format: { type: "json_object" },
  });

  const response = JSON.parse(completion.choices[0].message.content || "{}");
  return response.criteria || response.cases || [];
}

async function main() {
  const dbPath = path.join(process.cwd(), 'data', 'sampleCriteria.ts');
  
  // Read existing
  let fileContent = fs.readFileSync(dbPath, 'utf-8');
  
  // Extract the array content roughly
  // This is hacky, ideally we'd just write a json file, but the project uses .ts
  // Let's assume we can append or rewrite.
  // For safety, let's write to a new JSON file first `data/generated_criteria.json`
  
  const criteria: AssessmentCriteria[] = [];
  const existingIds = new Set<string>();

  console.log(`Generating ${TARGET_COUNT} cases...`);

  for (let i = 0; i < TARGET_COUNT; i += BATCH_SIZE) {
    console.log(`Batch ${i / BATCH_SIZE + 1}/${Math.ceil(TARGET_COUNT / BATCH_SIZE)}...`);
    try {
      const batch = await generateBatch(BATCH_SIZE, existingIds);
      batch.forEach(c => {
        // Fix potential ID collisions
        if (existingIds.has(c.id)) {
            c.id = `${c.id}-${Date.now()}`;
        }
        criteria.push(c);
        existingIds.add(c.id);
      });
      console.log(`Generated ${criteria.length} so far.`);
    } catch (error) {
      console.error("Error in batch:", error);
    }
  }

  // Write to TypeScript file
  const tsContent = `import { AssessmentCriteria } from "@/types";

export const sampleCriteria: AssessmentCriteria[] = ${JSON.stringify(criteria, null, 2)};
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'data', 'sampleCriteria.ts'), 
    tsContent
  );
  
  console.log("Done! Database updated.");
}

main();

