import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { sampleCriteria } from '../data/sampleCriteria';
import { AssessmentCriteria } from '../types';

// Load environment variables
dotenv.config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

interface CaseEmbedding {
  id: string;
  embedding: number[];
  metadata: {
    title: string;
    description: string;
    chapterTitle: string;
    baseFaultPercentage: number;
  };
}

/**
 * Generate embedding for a case
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embedding:`, error);
    throw error;
  }
}

/**
 * Create searchable text representation of a case
 */
function createCaseText(criteria: AssessmentCriteria): string {
  return [
    criteria.title,
    criteria.description,
    criteria.summary || '',
    criteria.chapterTitle,
    ...(criteria.modificationFactors || []).map(m => m.description).join(' ')
  ].join(' ').trim();
}

/**
 * Generate embeddings for all cases and save to vector index file
 */
async function generateVectorIndex() {
  console.log(`Starting vector index generation for ${sampleCriteria.length} cases...`);
  console.log(`Using OpenAI API key: ${process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Missing'}`);
  
  const embeddings: CaseEmbedding[] = [];
  const batchSize = 10; // Process in batches to avoid rate limits
  
  for (let i = 0; i < sampleCriteria.length; i += batchSize) {
    const batch = sampleCriteria.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sampleCriteria.length / batchSize)} (cases ${i + 1}-${Math.min(i + batchSize, sampleCriteria.length)})...`);
    
    const batchPromises = batch.map(async (criteria) => {
      try {
        const text = createCaseText(criteria);
        const embedding = await generateEmbedding(text);
        
        return {
          id: criteria.id,
          embedding,
          metadata: {
            title: criteria.title,
            description: criteria.description,
            chapterTitle: criteria.chapterTitle,
            baseFaultPercentage: criteria.baseFaultPercentage,
          },
        };
      } catch (error) {
        console.error(`Failed to generate embedding for case ${criteria.id}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults.filter(e => e !== null) as CaseEmbedding[]);
    
    // Small delay to avoid rate limiting
    if (i + batchSize < sampleCriteria.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Save to file
  const indexPath = path.join(process.cwd(), 'data', 'vectorIndex.json');
  fs.writeFileSync(indexPath, JSON.stringify(embeddings, null, 2));
  
  console.log(`✅ Vector index generated successfully!`);
  console.log(`   Total cases indexed: ${embeddings.length}`);
  console.log(`   Saved to: ${indexPath}`);
  console.log(`\n📊 Next steps:`);
  console.log(`   1. The vector index is ready for use`);
  console.log(`   2. Update the retrieval function to use these embeddings`);
  console.log(`   3. For production, consider using Pinecone or Qdrant for better scalability`);
}

// Run the generation
if (require.main === module) {
  generateVectorIndex().catch(console.error);
}

export { generateVectorIndex };



