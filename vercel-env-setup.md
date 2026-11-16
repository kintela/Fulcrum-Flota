# Variables de entorno necesarias en Vercel
# Ve a tu proyecto en Vercel Dashboard > Settings > Environment Variables

# Envío de correo con Microsoft Graph (aplicación de Entra ID)
GRAPH_TENANT_ID=identificador_del_directorio
GRAPH_CLIENT_ID=identificador_de_la_aplicacion
GRAPH_CLIENT_SECRET=secreto_de_la_aplicacion
GRAPH_FROM_EMAIL=flota@fulcrum.es

# Destinatario usado solo por la prueba sin usuario autenticado (opcional)
EMAIL_TEST_RECIPIENT=rquintela@fulcrum.es

# Secreto de los cron jobs (obligatorio). Vercel lo envía como "Authorization: Bearer <CRON_SECRET>"
# a los crons de vercel.json solo si la variable se llama exactamente CRON_SECRET.
CRON_SECRET=tu_secreto

# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase

# Google Maps (si aplica)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
# Opcional: clave exclusiva de servidor para la imagen del mapa en los emails.
# Si no se define, se usa NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
GOOGLE_MAPS_STATIC_API_KEY=tu_api_key_de_google_static_maps
