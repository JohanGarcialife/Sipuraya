# Upload Scripts - VPN Workflow

## Overview
Two-step process to upload stories with embeddings while managing VPN:
1. **Generate Embeddings** (VPN ON) - Calls OpenAI API
2. **Upload to Supabase** (VPN OFF) - Inserts to database

## Files
- `generate_embeddings_only.js` - Step 1 (VPN ON)
- `upload_to_supabase_only.js` - Step 2 (VPN OFF)

---

## Usage Instructions

### Prerequisites
✅ You already have: `ready_to_upload.json` (120 stories for Ad1289-Ad1409)

### Step 1: Generate Embeddings (VPN ON)

```bash
cd scripts

# Turn VPN ON first!
node generate_embeddings_only.js
```

**What it does:**
- Reads `ready_to_upload.json`
- Generates embeddings for each story using OpenAI
- Saves to `ready_with_embeddings.json`
- Takes ~2-3 minutes for 120 stories

**Expected output:**
```
🤖 Generating embeddings for 120 stories (VPN ON)...
[1/120] Ad1289... ✅
[2/120] Ad1290... ✅
...
✨ Embeddings generated! Saved to: ready_with_embeddings.json
```

### Step 2: Upload to Supabase (VPN OFF)

```bash
# Turn VPN OFF now!
node upload_to_supabase_only.js
```

**What it does:**
- Reads `ready_with_embeddings.json`
- Upserts stories to Supabase in batches of 50
- Uses `onConflict: 'story_id'` (updates if exists, creates if new)

**Expected output:**
```
🚀 Uploading 120 stories to Supabase (VPN OFF)...
Batch 1/3 (50 stories)... ✅
Batch 2/3 (50 stories)... ✅
Batch 3/3 (20 stories)... ✅
✨ Upload complete!
   Success: 120 stories
```

---

## Verification

After upload, verify on admin dashboard:
```
https://sipuraya.vercel.app/admin
```

Search for:
- Ad1289 ✅
- Ad1324 ✅
- Ad1409 ✅

---

## Troubleshooting

### "Missing OPENAI_API_KEY"
Check `.env.local` has `OPENAI_API_KEY=...`

### "Missing SUPABASE credentials"
Check `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

### "403 Country not supported" (during embeddings)
VPN is working correctly - OpenAI restricts your country, VPN bypasses this.
