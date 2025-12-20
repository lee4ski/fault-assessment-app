import { sampleCriteria } from '../data/sampleCriteria';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || '',
});

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log(`Generating embeddings for ${sampleCriteria.length} criteria...`);
  
  const vectorIndex = [];
  
  for (let i = 0; i < sampleCriteria.length; i++) {
    const criterion = sampleCriteria[i];
    const text = `${criterion.title} ${criterion.description} ${criterion.summary || ''}`;
    
    console.log(`[${i + 1}/${sampleCriteria.length}] Generating embedding for: ${criterion.id}`);
    
    const embedding = await generateEmbedding(text);
    
    vectorIndex.push({
      id: criterion.id,
      embedding,
      metadata: {
        title: criterion.title,
        description: criterion.description,
        chapterTitle: criterion.chapterTitle,
        baseFaultPercentage: criterion.baseFaultPercentage,
      },
    });
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const outputPath = path.join(process.cwd(), 'data', 'vectorIndex.json');
  fs.writeFileSync(outputPath, JSON.stringify(vectorIndex, null, 2));
  
  console.log(`✅ Vector index saved to ${outputPath}`);
  console.log(`   Total entries: ${vectorIndex.length}`);
}

main().catch(console.error);
