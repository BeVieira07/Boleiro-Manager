-- A função só deve rodar pelo gatilho de auth.users, nunca pela API (/rpc).
revoke execute on function public.criar_perfil() from public, anon, authenticated;
