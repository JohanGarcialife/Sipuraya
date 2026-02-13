const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

const MONTH_MAP = {
    'Nissan': 'ניסן', 'Nisan': 'ניסן', 'Iyar': 'אייר', 'Sivan': 'סיון',
    'Tamuz': 'תמוז', 'Tammuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
    'Tishrei': 'תשרי', 'Cheshvan': 'חשון', 'Kislev': 'כסלו',
    'Tevet': 'טבת', 'Shevat': 'שבט', 'Adar': 'אדר'
};

async function main() {
    let totalFixed = 0;

    for (const [eng, heb] of Object.entries(MONTH_MAP)) {
        const { data } = await supabase.from('stories').select('story_id, date_he')
            .ilike('date_he', '%' + eng + '%');

        if (!data || data.length === 0) continue;
        console.log(eng + ': ' + data.length + ' stories with English month name in date_he');

        for (const story of data) {
            const fixed = story.date_he.replace(new RegExp(eng, 'gi'), heb);
            const { error } = await supabase.from('stories').update({ date_he: fixed }).eq('story_id', story.story_id);
            if (error) console.error('  Error:', story.story_id, error.message);
            else totalFixed++;
        }
    }

    console.log('\nTotal fixed: ' + totalFixed);

    // Verify the first 3 Nissan stories
    const { data: check } = await supabase.from('stories').select('story_id, date_he, date_en')
        .ilike('date_en', '%Nissan%').limit(5);
    console.log('\nVerification (Nissan):');
    check.forEach(d => console.log('  ' + d.story_id + ': date_he="' + d.date_he + '" date_en="' + d.date_en + '"'));
}

main().catch(console.error);
