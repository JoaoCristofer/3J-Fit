import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://qnwmrkasfwqosqidjhpg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud21ya2FzZndxb3NxaWRqaHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjQxMDYsImV4cCI6MjA4Njk0MDEwNn0.9DsLyf3E_vY4jXWzZvda9DDiGMYQkG-z8DL_42BefnM";


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
