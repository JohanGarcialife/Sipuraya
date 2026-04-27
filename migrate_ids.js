require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

function cleanIdInternal(id) {
  if (!id) return null;
  const match = id.match(/([A-Za-z]+)(\d+)/);
  if (!match) return id.trim().toUpperCase();

  let prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  if (prefix === 'Ly') prefix = 'Iy';

  const num = parseInt(match[2], 10);
  return `${prefix}${num.toString().padStart(4, '0')}`;
}

async function migrate() {
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    console.log("Starting full migration...");

    while (hasMore) {
        console.log(`Fetching batch ${offset / limit + 1} (offset: ${offset})...`);
        const { data: stories, error } = await supabase
            .from('stories')
            .select('story_id')
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error("Fetch error:", error);
            break;
        }

        if (stories.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Found ${stories.length} stories in this batch. Normalizing...`);

        for (const story of stories) {
            const oldId = story.story_id;
            const newId = cleanIdInternal(oldId);

            if (oldId !== newId) {
                console.log(`Migrating: ${oldId} -> ${newId}`);
                const { error: updateError } = await supabase
                    .from('stories')
                    .update({ story_id: newId })
                    .eq('story_id', oldId);
                
                if (updateError) {
                    console.error(`Error updating ${oldId}:`, updateError);
                }
            }
        }
        
        offset += limit;
        if (stories.length < limit) hasMore = false;
    }
    console.log("Migration complete.");
}

migrate();
