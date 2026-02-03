/* ============================================
   CHAVOS BURGER - SUPABASE CONFIGURATION
   Configuración y cliente de Supabase
   ============================================ */

// === CREDENCIALES DE SUPABASE ===
const SUPABASE_URL = 'https://hvvjkvtvsywxiscwtjiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dmprdnR2c3l3eGlzY3d0aml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQyNTgsImV4cCI6MjA4NTcxMDI1OH0.ShxlseV7VBVKndbyPoFRLy3fN8Ijlz3fApYMYSjdXeY';

// === CLIENTE DE SUPABASE ===
// Se inicializa cuando se carga el SDK de Supabase
let supabase = null;

function initSupabase() {
  // Supabase JS v2 CDN expone el objeto como 'supabase' global
  const supabaseLib = window.supabase;

  if (supabaseLib && typeof supabaseLib.createClient === 'function') {
    supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase inicializado correctamente');
    return true;
  }

  console.error('❌ SDK de Supabase no encontrado. Verifica que el script del CDN se haya cargado.');
  return false;
}

// === AUTENTICACIÓN ===

// Iniciar sesión con email y password
async function loginWithEmail(email, password) {
  if (!supabase) {
    throw new Error('Supabase no inicializado');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Cerrar sesión
async function logout() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Obtener usuario actual
async function getCurrentUser() {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Verificar si hay sesión activa
async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

// Escuchar cambios de autenticación
function onAuthStateChange(callback) {
  if (!supabase) return;

  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// === OPERACIONES DE BASE DE DATOS ===

// --- CONFIGURACIÓN ---
async function getConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function updateConfiguracion(config) {
  // Primero verificar si existe
  const existing = await getConfiguracion();

  if (existing) {
    const { data, error } = await supabase
      .from('configuracion')
      .update(config)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('configuracion')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// --- CATEGORÍAS ---
async function getCategorias(soloVisibles = false) {
  let query = supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true });

  if (soloVisibles) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getCategoria(id) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function createCategoria(categoria) {
  const { data, error } = await supabase
    .from('categorias')
    .insert(categoria)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCategoria(id, categoria) {
  const { data, error } = await supabase
    .from('categorias')
    .update(categoria)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteCategoria(id) {
  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// --- PRODUCTOS ---
async function getProductos(soloVisibles = false) {
  let query = supabase
    .from('productos')
    .select('*')
    .order('orden', { ascending: true });

  if (soloVisibles) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getProductosPorCategoria(categoriaId, soloVisibles = false) {
  let query = supabase
    .from('productos')
    .select('*')
    .eq('categoria', categoriaId)
    .order('orden', { ascending: true });

  if (soloVisibles) {
    query = query.eq('visible', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getProducto(id) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function createProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .insert(producto)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateProducto(id, producto) {
  const { data, error } = await supabase
    .from('productos')
    .update(producto)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteProducto(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// --- BADGES ---
async function getBadges() {
  const { data, error } = await supabase
    .from('badges')
    .select('*');

  if (error) throw error;

  // Convertir array a objeto para compatibilidad con el formato anterior
  const badgesObj = {};
  (data || []).forEach(badge => {
    badgesObj[badge.id] = {
      texto: badge.texto,
      clase: badge.clase
    };
  });

  return badgesObj;
}

// === CARGAR TODOS LOS DATOS DEL MENÚ ===
async function cargarMenuCompleto(soloVisibles = false) {
  try {
    const [config, categorias, productos, badges] = await Promise.all([
      getConfiguracion(),
      getCategorias(soloVisibles),
      getProductos(soloVisibles),
      getBadges()
    ]);

    return {
      config: config || {},
      categorias: categorias || [],
      productos: productos || [],
      badges: badges || {}
    };
  } catch (error) {
    console.error('Error cargando menú desde Supabase:', error);
    throw error;
  }
}

// === GUARDAR TODOS LOS DATOS (para migración/sync) ===
async function guardarMenuCompleto(menuData) {
  try {
    // Guardar configuración
    if (menuData.config) {
      await updateConfiguracion(menuData.config);
    }

    // Para categorías y productos, usar upsert
    if (menuData.categorias && menuData.categorias.length > 0) {
      const { error } = await supabase
        .from('categorias')
        .upsert(menuData.categorias, { onConflict: 'id' });
      if (error) throw error;
    }

    if (menuData.productos && menuData.productos.length > 0) {
      const { error } = await supabase
        .from('productos')
        .upsert(menuData.productos, { onConflict: 'id' });
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error guardando menú en Supabase:', error);
    throw error;
  }
}

// Exportar funciones para uso global
window.SupabaseDB = {
  init: initSupabase,
  // Auth
  login: loginWithEmail,
  logout,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  // Config
  getConfiguracion,
  updateConfiguracion,
  // Categorías
  getCategorias,
  getCategoria,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  // Productos
  getProductos,
  getProductosPorCategoria,
  getProducto,
  createProducto,
  updateProducto,
  deleteProducto,
  // Badges
  getBadges,
  // Utilidades
  cargarMenuCompleto,
  guardarMenuCompleto
};
