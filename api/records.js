const { requireUser } = require('../lib/supabaseServer');

function toClientRecord(row) {
  return {
    id: row.id,
    date: row.date,
    weight: Number(row.weight),
    memo: row.memo || '',
    exercise: !!row.exercise,
    drink: !!row.drink,
  };
}

module.exports = async (req, res) => {
  const auth = await requireUser(req, res);
  if (!auth) return;
  const { supabase, user } = auth;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ records: data.map(toClientRecord) });
  }

  if (req.method === 'PUT') {
    const records = Array.isArray(req.body?.records) ? req.body.records : null;
    if (!records || !records.every(r => r.date && typeof r.weight === 'number')) {
      return res.status(400).json({ error: '잘못된 기록 형식입니다.' });
    }

    const { error: deleteError } = await supabase
      .from('weight_records')
      .delete()
      .eq('user_id', user.id);
    if (deleteError) return res.status(500).json({ error: deleteError.message });

    if (records.length === 0) {
      return res.status(200).json({ records: [] });
    }

    const rows = records.map(r => ({
      user_id: user.id,
      date: r.date,
      weight: r.weight,
      memo: r.memo || null,
      exercise: !!r.exercise,
      drink: !!r.drink,
    }));

    const { data, error: insertError } = await supabase
      .from('weight_records')
      .insert(rows)
      .select();
    if (insertError) return res.status(500).json({ error: insertError.message });
    return res.status(200).json({ records: data.map(toClientRecord) });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};
