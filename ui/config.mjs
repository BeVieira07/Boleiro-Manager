// Configuração do modo online (Supabase). Veja "Online (Supabase)" no README.
// Preencha com a URL do projeto e a chave PÚBLICA (anon / publishable) do Supabase: Project Settings > API.
// A chave pública pode ficar aqui (ela só dá o acesso que as regras de RLS do banco permitem).
// NUNCA coloque a chave de serviço (service_role / secret) neste arquivo nem em nenhum outro do repositório.
// Com os dois campos vazios, o jogo funciona offline como sempre e o login não aparece.
export const SUPABASE_URL = 'https://nfctxdzapspnxwttrwym.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mY3R4ZHphcHNwbnh3dHRyd3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MzMxMzMsImV4cCI6MjExMDEwOTEzM30.Zva2p5Q5o4Fbi8P5wX3vk2sHKiKg3Zq4PGL8N9wl0GM';
