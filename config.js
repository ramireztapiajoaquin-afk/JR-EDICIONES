const BOOKS_SUPABASE_URL = "https://wufftcheeyznuaymplyf.supabase.co";
const BOOKS_SUPABASE_KEY = "sb_publishable_1OgzXVDtS7aKSICG58Owtg_er1PKy2O";
const BOOKS_STORE_SLUG = "jr-leon-libros";

function booksClient(){
  return supabase.createClient(BOOKS_SUPABASE_URL, BOOKS_SUPABASE_KEY);
}
