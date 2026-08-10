const { getEnv } = require('../lib/supabaseServer');

module.exports = (req, res) => {
  try {
    const { url, anonKey } = getEnv();
    res.status(200).json({ supabaseUrl: url, supabaseAnonKey: anonKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
