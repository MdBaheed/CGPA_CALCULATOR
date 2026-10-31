module.exports = function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    response.status(503).json({
      error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to the Vercel project environment variables."
    });
    return;
  }

  response.status(200).json({ supabaseUrl, supabaseAnonKey });
};
