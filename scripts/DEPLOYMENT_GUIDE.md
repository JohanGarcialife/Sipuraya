# 🚀 Pasos para Recrear Tabla y Subir Historias

## Paso 1: Crear Tabla en Supabase

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **SQL Editor**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New Query"

3. **Ejecuta el Script**
   - Copia TODO el contenido de: `scripts/create_stories_table.sql`
   - Pégalo en el editor
   - Click en "Run" (o Ctrl+Enter)

4. **Verifica que se creó**
   - Deberías ver un mensaje de éxito
   - Ve a "Table Editor" → deberías ver tabla "stories"
   - Verifica que tiene columna "tags" (tipo: text[])

---

## Paso 2: Procesar Archivos (CON VPN 🟢)

**IMPORTANTE: Enciende tu VPN antes de este paso**

```bash
cd scripts
rm -f ready_to_upload.json
node batch_process.js
```

**Qué hace:**
- Procesa todos los archivos en `data/`
- Extrae tags de `###` markers
- Genera embeddings (requiere VPN para OpenAI)
- Crea archivo `ready_to_upload.json`

**Tiempo estimado:** 5-10 minutos

**Resultado esperado:**
```
📊 Processing: EN (XXX) | HE (XXX)
🔄 Merged XXX Hebrew bodies
.........
✅ Saved XXX stories to JSON.

📊 Batch Processing Complete!
   ✅ Success: 26
   ❌ Errors: 0
   📦 Total stories in JSON: ~2335
```

---

## Paso 3: Subir a Supabase (SIN VPN 🔴)

**IMPORTANTE: Apaga tu VPN antes de este paso**

```bash
node final_upload.js
```

**Qué hace:**
- Lee `ready_to_upload.json`
- Sube en batches de 100 historias
- Incluye el campo `tags`

**Tiempo estimado:** 2-3 minutos

**Resultado esperado:**
```
📤 Uploading 2335 stories to Supabase...
✅ Batch 1/24 uploaded (100 stories)
✅ Batch 2/24 uploaded (100 stories)
...
✅ Batch 24/24 uploaded (35 stories)

🎉 All stories uploaded successfully!
Total: 2335 stories
```

---

## Paso 4: Verificar en Dashboard

1. **Abre tu app local:**
   ```bash
   npm run dev
   ```

2. **Ve a Admin Panel:**
   - http://localhost:3000/admin

3. **Verifica:**
   - [ ] Total Stories muestra ~2335
   - [ ] Click "Edit" en cualquier historia
   - [ ] Verifica que body NO tiene `###`
   - [ ] Verifica que campo "Tags / Metadata" existe
   - [ ] Si la historia tiene tags, aparecen en el campo

---

## ✅ Checklist de Validación

- [ ] Tabla creada en Supabase con columna `tags`
- [ ] Procesamiento batch completó sin errores
- [ ] Upload completó: ~2335 historias
- [ ] Dashboard muestra historias correctamente
- [ ] Body text limpio (sin `###`)
- [ ] Tags extraídos y almacenados

---

## 🐛 Troubleshooting

### Error: "Cannot reach Supabase"
- **Causa:** VPN encendido en Paso 3
- **Solución:** Apaga VPN y reintenta

### Error: "403 Country not supported"
- **Causa:** VPN apagado en Paso 2
- **Solución:** Enciende VPN y reintenta

### Error: "relation stories does not exist"
- **Causa:** No ejecutaste Paso 1
- **Solución:** Ejecuta el SQL en Supabase primero

### Historias duplicadas
- **Causa:** Ejecutaste upload múltiples veces
- **Solución:** El script usa UPSERT, no debería duplicar

---

## 📝 Notas Importantes

- **VPN ON** para Paso 2 (OpenAI embeddings)
- **VPN OFF** para Paso 3 (Supabase upload)
- No cierres la terminal durante procesamiento
- El JSON generado pesa ~20-30MB
- Backup del .env.local recomendado

---

¡Listo! Siguiendo estos 4 pasos tendrás la tabla lista y todas las historias subidas con tags extraídos. 🎉
