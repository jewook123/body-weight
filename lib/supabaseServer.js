const { createClient } = require('@supabase/supabase-js');

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 설정되어 있지 않습니다.');
  }
  return { url, anonKey };
}

// Creates a Supabase client that forwards the caller's JWT so Postgres
// Row Level Security scopes every query to that user (auth.uid()).
function createUserClient(authHeader) {
  const { url, anonKey } = getEnv();
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

async function requireUser(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return null;
  }
  const supabase = createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
    return null;
  }
  return { supabase, user: data.user };
}

module.exports = { getEnv, createUserClient, requireUser };
