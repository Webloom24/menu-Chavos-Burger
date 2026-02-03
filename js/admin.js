/* ============================================
   CHAVOS BURGER - ADMIN PANEL JS
   Lógica del panel de administración
   Con integración Supabase
   ============================================ */

// === CONFIGURACIÓN ===
const JSON_DATA_URL = 'data/menu-data.json';
const STORAGE_KEY = 'chavos-burger-menu-data';
const MAX_IMAGE_SIZE = 500 * 1024; // 500KB

// === ESTADO GLOBAL ===
let menuData = null;
let confirmCallback = null;
let cambiosPendientes = false;
let usuarioActual = null;
let modoOffline = false;

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async function() {
  // Inicializar Supabase
  if (typeof SupabaseDB !== 'undefined') {
    const inicializado = SupabaseDB.init();

    if (!inicializado) {
      console.error('No se pudo inicializar Supabase');
      modoOffline = true;
      // Aún así mostrar login para intentar más tarde
      mostrarModalLogin();
      return;
    }

    // Verificar si hay sesión activa
    const autenticado = await verificarAutenticacion();

    if (!autenticado) {
      mostrarModalLogin();
      return;
    }
  } else {
    console.warn('SupabaseDB no disponible, modo offline activado');
    modoOffline = true;
    // Sin Supabase, mostrar login de todas formas (no funcionará pero informa al usuario)
    mostrarModalLogin();
    return;
  }

  await cargarDatos();
  inicializarNavegacion();
  renderizarTodo();
});

// === AUTENTICACIÓN ===
async function verificarAutenticacion() {
  try {
    usuarioActual = await SupabaseDB.getCurrentUser();
    return usuarioActual !== null;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return false;
  }
}

function mostrarModalLogin() {
  document.getElementById('modal-login').classList.add('active');
  document.getElementById('login-email').focus();

  // Ocultar el contenido principal hasta que inicie sesión
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-content').style.display = 'none';
}

function ocultarModalLogin() {
  document.getElementById('modal-login').classList.remove('active');
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.main-content').style.display = '';
}

async function iniciarSesion() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');

  if (!email || !password) {
    errorDiv.textContent = 'Por favor ingresa email y contraseña';
    errorDiv.classList.add('show');
    return;
  }

  errorDiv.classList.remove('show');

  // Mostrar loading
  const btnLogin = document.querySelector('.btn-login-submit');
  const textoOriginal = btnLogin.textContent;
  btnLogin.textContent = 'Iniciando sesión...';
  btnLogin.disabled = true;

  try {
    await SupabaseDB.login(email, password);
    usuarioActual = await SupabaseDB.getCurrentUser();

    ocultarModalLogin();
    await cargarDatos();
    inicializarNavegacion();
    renderizarTodo();
    mostrarToast('Sesión iniciada correctamente', 'success');
  } catch (error) {
    console.error('Error de login:', error);
    errorDiv.textContent = 'Email o contraseña incorrectos';
    errorDiv.classList.add('show');
  } finally {
    btnLogin.textContent = textoOriginal;
    btnLogin.disabled = false;
  }
}

async function cerrarSesion() {
  if (cambiosPendientes) {
    const confirmar = confirm('Tienes cambios sin guardar. ¿Deseas cerrar sesión de todas formas?');
    if (!confirmar) return;
  }

  try {
    await SupabaseDB.logout();
    usuarioActual = null;
    cambiosPendientes = false;
    localStorage.removeItem(STORAGE_KEY);
    mostrarToast('Sesión cerrada', 'info');
    mostrarModalLogin();
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    mostrarToast('Error al cerrar sesión', 'error');
  }
}

// Permitir login con Enter
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('modal-login').classList.contains('active')) {
    iniciarSesion();
  }
});

// === CARGA DE DATOS ===
async function cargarDatos() {
  // 1. Intentar cargar desde Supabase (si está disponible y autenticado)
  if (!modoOffline && typeof SupabaseDB !== 'undefined') {
    try {
      menuData = await SupabaseDB.cargarMenuCompleto(false); // false = incluir no visibles

      // Si Supabase devuelve datos vacíos, usar datos de fallback y sincronizar
      if (!menuData.categorias || menuData.categorias.length === 0) {
        console.log('Base de datos vacía, cargando datos iniciales...');
        const datosIniciales = obtenerDatosCompletos();
        menuData = datosIniciales;

        // Ofrecer sincronizar los datos iniciales a la nube
        mostrarToast('Base de datos vacía. Cargando datos iniciales...', 'info');

        // Sincronizar automáticamente a Supabase
        try {
          await SupabaseDB.guardarMenuCompleto(menuData);
          mostrarToast('Datos iniciales sincronizados a la nube', 'success');
        } catch (syncError) {
          console.error('Error sincronizando datos iniciales:', syncError);
          mostrarToast('Datos cargados localmente. Guarda cambios para sincronizar.', 'warning');
        }
      } else {
        mostrarToast('Datos cargados desde la nube', 'success');
      }

      guardarEnLocalStorage(); // Cache local
      finalizarCarga();
      return;
    } catch (e) {
      console.error('Error cargando desde Supabase:', e);
      mostrarToast('Error conectando con la nube, usando datos locales', 'warning');
    }
  }

  // 2. Intentar cargar desde localStorage (cache)
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    try {
      menuData = JSON.parse(localData);
      finalizarCarga();
      mostrarToast('Datos cargados desde caché local', 'info');
      return;
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
  }

  // 3. Intentar cargar desde JSON externo (fallback)
  try {
    const response = await fetch(JSON_DATA_URL);
    if (response.ok) {
      menuData = await response.json();
      guardarEnLocalStorage();
      finalizarCarga();
      mostrarToast('Datos cargados desde archivo JSON', 'success');
      return;
    }
  } catch (e) {
    console.error('Error fetching JSON:', e);
  }

  // 4. Usar datos embebidos completos como fallback final
  menuData = obtenerDatosCompletos();
  guardarEnLocalStorage();
  finalizarCarga();
  mostrarToast('Datos iniciales cargados', 'info');
}

// Finalizar carga y renderizar
function finalizarCarga() {
  cambiosPendientes = false;
  actualizarIndicadorEstado('');
}

function getRepoPath() {
  // Detectar el repositorio desde la URL si está en GitHub Pages
  const hostname = window.location.hostname;
  if (hostname.includes('github.io')) {
    const parts = hostname.split('.');
    const username = parts[0];
    const repo = window.location.pathname.split('/')[1] || '';
    return `${username}/${repo}`;
  }
  return 'usuario/repo'; // fallback
}

function obtenerDatosDefault() {
  return {
    config: {
      nombreRestaurante: "Chavos Burger",
      slogan: "se me chispoteó... pero de lo rica 😋",
      whatsapp: "573183752974",
      telefono: "318 375 2974",
      horario: "Lun–Dom: 5:00 PM – 10:30 PM",
      diaCerrado: "Martes",
      desarrolladoPor: "Webloom"
    },
    categorias: [],
    productos: [],
    badges: {
      popular: { texto: "POPULAR", clase: "popular" },
      nuevo: { texto: "NUEVO", clase: "nuevo" },
      recomendado: { texto: "⭐ RECOMENDADO", clase: "recomendado" },
      premium: { texto: "👑 PREMIUM", clase: "premium-badge" },
      picante: { texto: "🌶️ PICANTE", clase: "picante" }
    }
  };
}

// Datos completos del menú como fallback (para funcionar sin servidor)
function obtenerDatosCompletos() {
  return {
    "config": {
      "nombreRestaurante": "Chavos Burger",
      "slogan": "se me chispoteó... pero de lo rica 😋",
      "whatsapp": "573183752974",
      "telefono": "318 375 2974",
      "horario": "Lun–Dom: 5:00 PM – 10:30 PM",
      "diaCerrado": "Martes",
      "desarrolladoPor": "Webloom"
    },
    "categorias": [
      {"id": "burgers", "nombre": "Burgers", "emoji": "🍔", "icono": "images/icon-burgers.png", "subtitulo": "Acompañadas con papas a la francesa", "orden": 1, "visible": true},
      {"id": "perros", "nombre": "Perros", "emoji": "🌭", "icono": "images/icon-perros.png", "subtitulo": "Acompañados con papas a la francesa", "orden": 2, "visible": true},
      {"id": "salchipapas", "nombre": "Salchipapas", "emoji": "🍟", "icono": "images/icon-salchipapas.png", "subtitulo": "Con papas a la francesa", "orden": 3, "visible": true},
      {"id": "delicias-chavos", "nombre": "Delicias Chavos", "emoji": "✨", "icono": "images/icon-delicias.png", "subtitulo": "Especialidades de la casa", "orden": 4, "visible": true},
      {"id": "sandwich", "nombre": "Sándwich", "emoji": "🥪", "icono": "images/icon-sandwich.png", "subtitulo": "Acompañados con papas a la francesa", "orden": 5, "visible": true},
      {"id": "desgranados", "nombre": "Desgranados", "emoji": "🌽", "icono": "images/icon-desgranados.png", "subtitulo": "Con papa francesa", "orden": 6, "visible": true}
    ],
    "productos": [
      {"id": 1, "nombre": "Vecindad", "descripcion": "Carne 150gr, lechuga, tomate, cebolla, queso", "precio": 18000, "categoria": "burgers", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 2, "nombre": "Doña Clotilde", "descripcion": "Carne 150gr, pollo desmechado, queso, lechuga, tomate, cebolla", "precio": 20000, "categoria": "burgers", "badge": "popular", "orden": 2, "visible": true, "imagen": null},
      {"id": 3, "nombre": "Jaimito", "descripcion": "Carne 150gr, tocineta, huevo, queso, lechuga, tomate, cebolla", "precio": 20000, "categoria": "burgers", "badge": null, "orden": 3, "visible": true, "imagen": null},
      {"id": 4, "nombre": "Chilindrina", "descripcion": "Carne 150gr, 2 tocinetas, queso, lechuga, tomate, cebolla", "precio": 20000, "categoria": "burgers", "badge": null, "orden": 4, "visible": true, "imagen": null},
      {"id": 5, "nombre": "Chapulín", "descripcion": "Carne 150gr, pollo desmechado, tocineta, queso, lechuga, tomate, cebolla", "precio": 23000, "categoria": "burgers", "badge": null, "orden": 5, "visible": true, "imagen": null},
      {"id": 6, "nombre": "Dr Chapatin", "descripcion": "Carne 150gr, pollo desmechado, salchicha americana, queso, lechuga, tomate, cebolla", "precio": 23000, "categoria": "burgers", "badge": null, "orden": 6, "visible": true, "imagen": null},
      {"id": 7, "nombre": "Popis", "descripcion": "Carne 150gr, pollo desmechado, chorizo artesanal, tocineta, maíz, queso, lechuga, tomate, cebolla", "precio": 25000, "categoria": "burgers", "badge": null, "orden": 7, "visible": true, "imagen": null},
      {"id": 8, "nombre": "Don Barriga", "descripcion": "Doble carne 150gr, tocineta, queso, lechuga, tomate, cebolla", "precio": 26000, "categoria": "burgers", "badge": null, "orden": 8, "visible": true, "imagen": null},
      {"id": 9, "nombre": "La Minina", "descripcion": "Doble carne 150gr, doble pollo desmechado, queso, lechuga, tomate, cebolla", "precio": 29000, "categoria": "burgers", "badge": null, "orden": 9, "visible": true, "imagen": null},
      {"id": 10, "nombre": "Chavos", "descripcion": "Carne 150gr, carne desmechada, chorizo, tocineta, nachos, jalapeños, guacamole, queso, lechuga, tomate, cebolla", "precio": 29000, "categoria": "burgers", "badge": "recomendado", "orden": 10, "visible": true, "imagen": null},
      {"id": 11, "nombre": "Godines", "descripcion": "Doble carne 150gr, carne desmechada, pollo desmechado, tocineta, queso, aros de cebolla, chorizo artesanal, lechuga, tomate, cebolla", "precio": 33000, "categoria": "burgers", "badge": "premium", "orden": 11, "visible": true, "imagen": null},
      {"id": 12, "nombre": "Vecindad", "descripcion": "Salchicha americana, queso fundido, cebolla, papitas chips", "precio": 16000, "categoria": "perros", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 13, "nombre": "Kiko", "descripcion": "Salchicha americana, pollo desmechado, tocineta, queso, cebolla", "precio": 18000, "categoria": "perros", "badge": null, "orden": 2, "visible": true, "imagen": null},
      {"id": 14, "nombre": "Don Ramón", "descripcion": "Salchicha americana, pollo desmechado, carne en cuadritos, queso, cebolla", "precio": 20000, "categoria": "perros", "badge": null, "orden": 3, "visible": true, "imagen": null},
      {"id": 15, "nombre": "Perro Bacon 33CM", "descripcion": "Salchicha americana X2, queso costeño, tocineta picada, papitas chips, cebolla", "precio": 22000, "categoria": "perros", "badge": null, "orden": 4, "visible": true, "imagen": null},
      {"id": 16, "nombre": "Ñoño 33CM XXL", "descripcion": "Salchicha americana X2, carne desmechada, pollo desmechado, queso, maíz, tocineta, cebolla", "precio": 25000, "categoria": "perros", "badge": null, "orden": 5, "visible": true, "imagen": null},
      {"id": 17, "nombre": "Peterete", "descripcion": "2 salchichas americanas, pollo desmechado, pepperoni, queso, cebolla", "precio": 25000, "categoria": "perros", "badge": null, "orden": 6, "visible": true, "imagen": null},
      {"id": 18, "nombre": "Chimostrufia 33CM", "descripcion": "Salchicha americana X2, carne de hamburguesa picada, maíz, pico de gallo, guacamole, nachos, jalapeños, queso fundido", "precio": 28000, "categoria": "perros", "badge": "popular", "orden": 7, "visible": true, "imagen": null},
      {"id": 19, "nombre": "Matolote 33CM XXL", "descripcion": "Salchicha americana X2, carne y pollo en cuadritos, queso, tocineta X2, cebolla", "precio": 32000, "categoria": "perros", "badge": "premium", "orden": 8, "visible": true, "imagen": null},
      {"id": 20, "nombre": "Chompiras", "descripcion": "2 salchichas zenú, queso fundido, queso costeño", "precio": 16000, "categoria": "salchipapas", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 21, "nombre": "Chaparrón", "descripcion": "Chorizo X2, queso fundido, queso costeño", "precio": 17000, "categoria": "salchipapas", "badge": null, "orden": 2, "visible": true, "imagen": null},
      {"id": 22, "nombre": "Chompiras Especial", "descripcion": "2 salchichas zenú, pollo desmechado, queso costeño, queso fundido, vegetales, papitas chips", "precio": 19000, "categoria": "salchipapas", "badge": null, "orden": 3, "visible": true, "imagen": null},
      {"id": 23, "nombre": "Chaparrón Especial", "descripcion": "2 chorizos, pollo desmechado, papitas chips, vegetales, queso costeño, queso fundido", "precio": 20000, "categoria": "salchipapas", "badge": null, "orden": 4, "visible": true, "imagen": null},
      {"id": 24, "nombre": "Chanfle", "descripcion": "Salchicha americana, chorizo, carne de hamburguesa picada, queso fundido, tocineta picada, quesos", "precio": 25000, "categoria": "salchipapas", "badge": null, "orden": 5, "visible": true, "imagen": null},
      {"id": 25, "nombre": "Doña Nieves", "descripcion": "Chorizo, salchicha americana, pollo desmechado, quesos, maíz, pepperoni, cebolla", "precio": 25000, "categoria": "salchipapas", "badge": "nuevo", "orden": 6, "visible": true, "imagen": null},
      {"id": 26, "nombre": "Botija", "descripcion": "Chorizo, pollo y carne desmechados, maíz, quesos, 2 salchichas zenú, tocineta", "precio": 38000, "categoria": "salchipapas", "badge": "premium", "orden": 7, "visible": true, "imagen": null},
      {"id": 27, "nombre": "Papas Lucas", "descripcion": "Carne desmechada, maíz, maduritos, 2 chorizos, quesos, papa a la francesa", "precio": 38000, "categoria": "delicias-chavos", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 28, "nombre": "Patacón Carne", "descripcion": "Carne desmechada, chorizo, maíz, vegetales, queso fundido, queso costeño, papitas chips", "precio": 20000, "categoria": "delicias-chavos", "badge": null, "orden": 2, "visible": true, "imagen": null},
      {"id": 29, "nombre": "Patacón Ranchero", "descripcion": "Pollo desmechado, vegetales, tocineta, queso fundido, queso costeño, salchicha, papitas chips, maíz", "precio": 20000, "categoria": "delicias-chavos", "badge": null, "orden": 3, "visible": true, "imagen": null},
      {"id": 30, "nombre": "Mexicano", "descripcion": "Carne de hamburguesa picada, carne desmechada, maíz, queso fundido, queso costeño, jalapeños, guacamole, vegetales, nachos", "precio": 25000, "categoria": "delicias-chavos", "badge": "picante", "orden": 4, "visible": true, "imagen": null},
      {"id": 31, "nombre": "Patacón Especial", "descripcion": "Carne y pollo en cuadritos, chorizo, pepperoni, queso fundido, queso costeño, vegetales", "precio": 25000, "categoria": "delicias-chavos", "badge": null, "orden": 5, "visible": true, "imagen": null},
      {"id": 32, "nombre": "Nachos para dos", "descripcion": "Nachos, carne desmechada, tocineta, chorizo premium, carne artesanal, maíz, guacamole, vegetales, queso, papa a la francesa", "precio": 38000, "categoria": "delicias-chavos", "badge": null, "orden": 6, "visible": true, "imagen": null},
      {"id": 33, "nombre": "El Gorgojo", "descripcion": "Pollo desmechado, queso, pepperoni, vegetales", "precio": 16000, "categoria": "sandwich", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 34, "nombre": "Carneseca", "descripcion": "Carne desmechada, chorizo, maíz, queso, vegetales", "precio": 17000, "categoria": "sandwich", "badge": null, "orden": 2, "visible": true, "imagen": null},
      {"id": 35, "nombre": "Ranchero", "descripcion": "Pollo desmechado, queso fundido, queso costeño, maíz, tocineta, salchicha zenú, papa francesa", "precio": 18000, "categoria": "desgranados", "badge": null, "orden": 1, "visible": true, "imagen": null},
      {"id": 36, "nombre": "Mixto", "descripcion": "Pollo desmechado, queso fundido, queso costeño, maíz, tocineta, carne en cuadritos, papa francesa", "precio": 22000, "categoria": "desgranados", "badge": null, "orden": 2, "visible": true, "imagen": null},
      {"id": 37, "nombre": "De carne", "descripcion": "Carne desmechada, queso fundido, queso costeño, chorizo, maíz, tocineta, papa francesa", "precio": 23000, "categoria": "desgranados", "badge": null, "orden": 3, "visible": true, "imagen": null},
      {"id": 38, "nombre": "Especial Para 2", "descripcion": "Carne y pollo en cuadros, queso fundido, queso costeño, maíz, tocineta, chorizo, papa francesa", "precio": 37000, "categoria": "desgranados", "badge": "recomendado", "orden": 4, "visible": true, "imagen": null}
    ],
    "badges": {
      "popular": {"texto": "POPULAR", "clase": "popular"},
      "nuevo": {"texto": "NUEVO", "clase": "nuevo"},
      "recomendado": {"texto": "⭐ RECOMENDADO", "clase": "recomendado"},
      "premium": {"texto": "👑 PREMIUM", "clase": "premium-badge"},
      "picante": {"texto": "🌶️ PICANTE", "clase": "picante"}
    }
  };
}

// === GESTIÓN DE CAMBIOS ===

// Marcar que hay cambios pendientes
function marcarCambios() {
  cambiosPendientes = true;
  actualizarIndicadorEstado('modified');
}

// Actualizar indicador visual de estado
function actualizarIndicadorEstado(estado) {
  const indicator = document.getElementById('status-indicator');
  if (!indicator) return;

  const texto = indicator.querySelector('.status-text');
  indicator.className = `status-indicator ${estado}`;

  const textos = {
    modified: 'Cambios sin guardar',
    saving: 'Guardando...',
    saved: 'Guardado en nube',
    '': 'Sin cambios'
  };
  texto.textContent = textos[estado] || 'Sin cambios';
}

// Guardar cambios (guarda en Supabase y localStorage)
async function guardarCambios() {
  actualizarIndicadorEstado('saving');

  // Guardar en localStorage primero (caché local)
  guardarEnLocalStorage();

  // Si Supabase está disponible, guardar en la nube
  if (!modoOffline && typeof SupabaseDB !== 'undefined') {
    try {
      // Guardar configuración
      await SupabaseDB.updateConfiguracion(menuData.config);

      // Guardar categorías y productos usando upsert
      await SupabaseDB.guardarMenuCompleto(menuData);

      cambiosPendientes = false;
      actualizarIndicadorEstado('saved');
      mostrarToast('Cambios guardados en la nube', 'success');
    } catch (error) {
      console.error('Error guardando en Supabase:', error);
      actualizarIndicadorEstado('modified');
      mostrarToast('Error guardando en la nube. Cambios guardados localmente.', 'warning');
    }
  } else {
    cambiosPendientes = false;
    actualizarIndicadorEstado('saved');
    mostrarToast('Cambios guardados localmente', 'success');
  }
}

// Guardar en localStorage
function guardarEnLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(menuData));

  // Disparar evento para sincronización entre pestañas
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(menuData)
  }));
}

// Prevenir pérdida de cambios al cerrar
window.addEventListener('beforeunload', (e) => {
  if (cambiosPendientes) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// === NAVEGACIÓN ===
function inicializarNavegacion() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.dataset.section;

      // Actualizar nav activa
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      this.classList.add('active');

      // Mostrar sección
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${section}`).classList.add('active');

      // Actualizar título y subtítulo
      const sectionInfo = {
        productos: {
          title: 'Gestión de Productos',
          subtitle: 'Agrega, edita o elimina productos del menú'
        },
        categorias: {
          title: 'Gestión de Categorías',
          subtitle: 'Organiza las categorías de tu menú'
        },
        config: {
          title: 'Configuración',
          subtitle: 'Ajustes generales del restaurante'
        }
      };

      document.getElementById('section-title').textContent = sectionInfo[section].title;
      document.getElementById('section-subtitle').textContent = sectionInfo[section].subtitle;
    });
  });
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');

  // Si abrimos el sidebar, agregar listener para cerrar al hacer clic fuera
  if (sidebar.classList.contains('open')) {
    setTimeout(() => {
      document.addEventListener('click', cerrarSidebarAlClickFuera);
    }, 100);
  }
}

// Cerrar sidebar al hacer clic fuera (móvil)
function cerrarSidebarAlClickFuera(e) {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.btn-menu-toggle');

  if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
    sidebar.classList.remove('open');
    document.removeEventListener('click', cerrarSidebarAlClickFuera);
  }
}

// Cerrar sidebar al seleccionar una opción en móvil
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 1024) {
      document.querySelector('.sidebar').classList.remove('open');
      document.removeEventListener('click', cerrarSidebarAlClickFuera);
    }
  });
});

// === RENDERIZADO ===
function renderizarTodo() {
  renderizarProductos();
  renderizarCategorias();
  renderizarConfiguracion();
  llenarSelectCategorias();
}

function renderizarProductos() {
  const tbody = document.getElementById('tbody-productos');
  const productos = menuData.productos.sort((a, b) => {
    if (a.categoria !== b.categoria) {
      const catA = menuData.categorias.find(c => c.id === a.categoria);
      const catB = menuData.categorias.find(c => c.id === b.categoria);
      return (catA?.orden || 0) - (catB?.orden || 0);
    }
    return a.orden - b.orden;
  });

  tbody.innerHTML = productos.map(producto => {
    const categoria = menuData.categorias.find(c => c.id === producto.categoria);
    const catNombre = categoria ? `${categoria.emoji} ${categoria.nombre}` : producto.categoria;

    const imgHtml = producto.imagen
      ? `<img src="${producto.imagen}" class="product-thumb" alt="${producto.nombre}">`
      : `<div class="product-thumb placeholder">🍔</div>`;

    const badgeHtml = producto.badge
      ? `<span class="badge-cell ${producto.badge}">${menuData.badges[producto.badge]?.texto || producto.badge}</span>`
      : '-';

    return `
      <tr data-id="${producto.id}">
        <td>
          <div class="order-controls">
            <button class="order-btn" onclick="moverProducto(${producto.id}, -1)">▲</button>
            <span>${producto.orden}</span>
            <button class="order-btn" onclick="moverProducto(${producto.id}, 1)">▼</button>
          </div>
        </td>
        <td>${imgHtml}</td>
        <td><strong>${producto.nombre}</strong></td>
        <td>${catNombre}</td>
        <td>$${producto.precio.toLocaleString('es-CO')}</td>
        <td>${badgeHtml}</td>
        <td>
          <div class="visibility-toggle ${producto.visible ? 'active' : ''}"
               onclick="toggleVisibilidadProducto(${producto.id})"></div>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit" onclick="editarProducto(${producto.id})">✏️</button>
            <button class="btn-icon delete" onclick="eliminarProducto(${producto.id})">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderizarCategorias() {
  const grid = document.getElementById('grid-categorias');
  const categorias = menuData.categorias.sort((a, b) => a.orden - b.orden);

  grid.innerHTML = categorias.map(cat => {
    const productosCount = menuData.productos.filter(p => p.categoria === cat.id).length;
    const iconHtml = cat.icono
      ? `<img src="${cat.icono}" alt="${cat.nombre}">`
      : cat.emoji;

    return `
      <div class="category-card ${cat.visible ? '' : 'hidden'}" data-id="${cat.id}">
        <div class="card-header">
          <div class="card-icon">${iconHtml}</div>
          <div class="card-title">
            <h4>${cat.emoji} ${cat.nombre}</h4>
            <span>ID: ${cat.id}</span>
          </div>
          <div class="card-order-controls">
            <button class="card-order-btn" onclick="moverCategoria('${cat.id}', -1)">▲</button>
            <button class="card-order-btn" onclick="moverCategoria('${cat.id}', 1)">▼</button>
          </div>
        </div>
        <p class="card-subtitle">${cat.subtitulo || 'Sin subtítulo'}</p>
        <div class="card-footer">
          <span class="card-stats">${productosCount} productos · Orden: ${cat.orden}</span>
          <div class="card-actions">
            <button class="btn-icon edit" onclick="editarCategoria('${cat.id}')">✏️</button>
            <button class="btn-icon delete" onclick="eliminarCategoria('${cat.id}')">🗑️</button>
            <div class="visibility-toggle ${cat.visible ? 'active' : ''}"
                 onclick="toggleVisibilidadCategoria('${cat.id}')"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderizarConfiguracion() {
  const config = menuData.config;
  document.getElementById('config-nombre').value = config.nombreRestaurante || '';
  document.getElementById('config-slogan').value = config.slogan || '';
  document.getElementById('config-whatsapp').value = config.whatsapp || '';
  document.getElementById('config-telefono').value = config.telefono || '';
  document.getElementById('config-horario').value = config.horario || '';
  document.getElementById('config-diacerrado').value = config.diaCerrado || '';
  document.getElementById('config-desarrollador').value = config.desarrolladoPor || '';
}

function llenarSelectCategorias() {
  const selects = ['filter-categoria', 'producto-categoria'];
  const categorias = menuData.categorias.sort((a, b) => a.orden - b.orden);

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    const isFilter = id === 'filter-categoria';
    select.innerHTML = isFilter ? '<option value="">Todas las categorías</option>' : '';

    categorias.forEach(cat => {
      select.innerHTML += `<option value="${cat.id}">${cat.emoji} ${cat.nombre}</option>`;
    });
  });
}

// === PRODUCTOS: CRUD ===
function abrirModalProducto(id = null) {
  const modal = document.getElementById('modal-producto');
  const titulo = document.getElementById('modal-producto-titulo');

  limpiarFormularioProducto();

  if (id) {
    const producto = menuData.productos.find(p => p.id === id);
    if (producto) {
      titulo.textContent = 'Editar Producto';
      document.getElementById('producto-id').value = producto.id;
      document.getElementById('producto-nombre').value = producto.nombre;
      document.getElementById('producto-descripcion').value = producto.descripcion;
      document.getElementById('producto-precio').value = producto.precio;
      document.getElementById('producto-categoria').value = producto.categoria;
      document.getElementById('producto-badge').value = producto.badge || '';
      document.getElementById('producto-orden').value = producto.orden;
      document.getElementById('producto-visible').checked = producto.visible;

      if (producto.imagen) {
        mostrarPreviewImagen(producto.imagen);
      }
    }
  } else {
    titulo.textContent = 'Nuevo Producto';
    const maxOrden = Math.max(0, ...menuData.productos.map(p => p.orden));
    document.getElementById('producto-orden').value = maxOrden + 1;
  }

  modal.classList.add('active');
}

function cerrarModalProducto() {
  document.getElementById('modal-producto').classList.remove('active');
  limpiarFormularioProducto();
}

function limpiarFormularioProducto() {
  document.getElementById('producto-id').value = '';
  document.getElementById('producto-nombre').value = '';
  document.getElementById('producto-descripcion').value = '';
  document.getElementById('producto-precio').value = '';
  document.getElementById('producto-categoria').value = '';
  document.getElementById('producto-badge').value = '';
  document.getElementById('producto-orden').value = '';
  document.getElementById('producto-visible').checked = true;
  document.getElementById('producto-imagen-url').value = '';
  document.getElementById('producto-imagen-local').value = '';
  document.getElementById('producto-imagen-file').value = '';
  ocultarPreviewImagen();
}

function guardarProducto() {
  const id = document.getElementById('producto-id').value;
  const nombre = document.getElementById('producto-nombre').value.trim();
  const descripcion = document.getElementById('producto-descripcion').value.trim();
  const precio = parseInt(document.getElementById('producto-precio').value);
  const categoria = document.getElementById('producto-categoria').value;
  const badge = document.getElementById('producto-badge').value || null;
  const orden = parseInt(document.getElementById('producto-orden').value) || 1;
  const visible = document.getElementById('producto-visible').checked;

  // Validación
  if (!nombre || !descripcion || !precio || !categoria) {
    mostrarToast('Por favor completa todos los campos obligatorios', 'error');
    return;
  }

  // Obtener imagen
  const imagen = obtenerImagenProducto();

  if (id) {
    // Editar existente
    const index = menuData.productos.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
      menuData.productos[index] = {
        ...menuData.productos[index],
        nombre, descripcion, precio, categoria, badge, orden, visible, imagen
      };
      mostrarToast('Producto actualizado correctamente', 'success');
    }
  } else {
    // Crear nuevo
    const nuevoId = Math.max(0, ...menuData.productos.map(p => p.id)) + 1;
    menuData.productos.push({
      id: nuevoId, nombre, descripcion, precio, categoria, badge, orden, visible, imagen
    });
    mostrarToast('Producto creado correctamente', 'success');
  }

  marcarCambios();
  guardarEnLocalStorage();
  renderizarProductos();
  cerrarModalProducto();
}

function editarProducto(id) {
  abrirModalProducto(id);
}

function eliminarProducto(id) {
  const producto = menuData.productos.find(p => p.id === id);
  if (!producto) return;

  mostrarConfirmacion(
    `¿Estás seguro de eliminar "${producto.nombre}"?`,
    () => {
      menuData.productos = menuData.productos.filter(p => p.id !== id);
      marcarCambios();
      guardarEnLocalStorage();
      renderizarProductos();
      mostrarToast('Producto eliminado', 'success');
    }
  );
}

function toggleVisibilidadProducto(id) {
  const producto = menuData.productos.find(p => p.id === id);
  if (producto) {
    producto.visible = !producto.visible;
    marcarCambios();
    guardarEnLocalStorage();
    renderizarProductos();
  }
}

function moverProducto(id, direccion) {
  const producto = menuData.productos.find(p => p.id === id);
  if (!producto) return;

  const productosCategoria = menuData.productos
    .filter(p => p.categoria === producto.categoria)
    .sort((a, b) => a.orden - b.orden);

  const index = productosCategoria.findIndex(p => p.id === id);
  const newIndex = index + direccion;

  if (newIndex < 0 || newIndex >= productosCategoria.length) return;

  // Intercambiar órdenes
  const temp = productosCategoria[index].orden;
  productosCategoria[index].orden = productosCategoria[newIndex].orden;
  productosCategoria[newIndex].orden = temp;

  marcarCambios();
  guardarEnLocalStorage();
  renderizarProductos();
}

function filtrarProductos() {
  const categoria = document.getElementById('filter-categoria').value;
  const busqueda = document.getElementById('search-productos').value.toLowerCase();

  document.querySelectorAll('#tbody-productos tr').forEach(tr => {
    const id = parseInt(tr.dataset.id);
    const producto = menuData.productos.find(p => p.id === id);
    if (!producto) return;

    const coincideCategoria = !categoria || producto.categoria === categoria;
    const coincideBusqueda = !busqueda ||
      producto.nombre.toLowerCase().includes(busqueda) ||
      producto.descripcion.toLowerCase().includes(busqueda);

    tr.style.display = coincideCategoria && coincideBusqueda ? '' : 'none';
  });
}

// === CATEGORÍAS: CRUD ===
function abrirModalCategoria(id = null) {
  const modal = document.getElementById('modal-categoria');
  const titulo = document.getElementById('modal-categoria-titulo');

  limpiarFormularioCategoria();

  if (id) {
    const categoria = menuData.categorias.find(c => c.id === id);
    if (categoria) {
      titulo.textContent = 'Editar Categoría';
      document.getElementById('categoria-id-edit').value = categoria.id;
      document.getElementById('categoria-id').value = categoria.id;
      document.getElementById('categoria-id').disabled = true;
      document.getElementById('categoria-nombre').value = categoria.nombre;
      document.getElementById('categoria-emoji').value = categoria.emoji || '';
      document.getElementById('categoria-icono').value = categoria.icono || '';
      document.getElementById('categoria-subtitulo').value = categoria.subtitulo || '';
      document.getElementById('categoria-orden').value = categoria.orden;
      document.getElementById('categoria-visible').checked = categoria.visible;
    }
  } else {
    titulo.textContent = 'Nueva Categoría';
    document.getElementById('categoria-id').disabled = false;
    const maxOrden = Math.max(0, ...menuData.categorias.map(c => c.orden));
    document.getElementById('categoria-orden').value = maxOrden + 1;
  }

  modal.classList.add('active');
}

function cerrarModalCategoria() {
  document.getElementById('modal-categoria').classList.remove('active');
  limpiarFormularioCategoria();
}

function limpiarFormularioCategoria() {
  document.getElementById('categoria-id-edit').value = '';
  document.getElementById('categoria-id').value = '';
  document.getElementById('categoria-id').disabled = false;
  document.getElementById('categoria-nombre').value = '';
  document.getElementById('categoria-emoji').value = '';
  document.getElementById('categoria-icono').value = '';
  document.getElementById('categoria-subtitulo').value = '';
  document.getElementById('categoria-orden').value = '';
  document.getElementById('categoria-visible').checked = true;
}

function guardarCategoria() {
  const idOriginal = document.getElementById('categoria-id-edit').value;
  const id = document.getElementById('categoria-id').value.trim();
  const nombre = document.getElementById('categoria-nombre').value.trim();
  const emoji = document.getElementById('categoria-emoji').value.trim();
  const icono = document.getElementById('categoria-icono').value.trim();
  const subtitulo = document.getElementById('categoria-subtitulo').value.trim();
  const orden = parseInt(document.getElementById('categoria-orden').value) || 1;
  const visible = document.getElementById('categoria-visible').checked;

  // Validación
  if (!id || !nombre) {
    mostrarToast('Por favor completa ID y Nombre', 'error');
    return;
  }

  // Validar formato de ID
  if (!/^[a-z0-9-]+$/.test(id)) {
    mostrarToast('El ID solo puede contener letras minúsculas, números y guiones', 'error');
    return;
  }

  // Verificar ID único (solo para nuevas categorías)
  if (!idOriginal && menuData.categorias.some(c => c.id === id)) {
    mostrarToast('Ya existe una categoría con ese ID', 'error');
    return;
  }

  if (idOriginal) {
    // Editar existente
    const index = menuData.categorias.findIndex(c => c.id === idOriginal);
    if (index !== -1) {
      menuData.categorias[index] = {
        id: idOriginal, nombre, emoji, icono, subtitulo, orden, visible
      };
      mostrarToast('Categoría actualizada correctamente', 'success');
    }
  } else {
    // Crear nueva
    menuData.categorias.push({
      id, nombre, emoji, icono, subtitulo, orden, visible
    });
    mostrarToast('Categoría creada correctamente', 'success');
  }

  marcarCambios();
  guardarEnLocalStorage();
  renderizarCategorias();
  llenarSelectCategorias();
  cerrarModalCategoria();
}

function editarCategoria(id) {
  abrirModalCategoria(id);
}

function eliminarCategoria(id) {
  const categoria = menuData.categorias.find(c => c.id === id);
  if (!categoria) return;

  const productosEnCategoria = menuData.productos.filter(p => p.categoria === id).length;

  if (productosEnCategoria > 0) {
    mostrarToast(`No puedes eliminar esta categoría porque tiene ${productosEnCategoria} productos`, 'error');
    return;
  }

  mostrarConfirmacion(
    `¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`,
    () => {
      menuData.categorias = menuData.categorias.filter(c => c.id !== id);
      marcarCambios();
      guardarEnLocalStorage();
      renderizarCategorias();
      llenarSelectCategorias();
      mostrarToast('Categoría eliminada', 'success');
    }
  );
}

function toggleVisibilidadCategoria(id) {
  const categoria = menuData.categorias.find(c => c.id === id);
  if (categoria) {
    categoria.visible = !categoria.visible;
    marcarCambios();
    guardarEnLocalStorage();
    renderizarCategorias();
  }
}

function moverCategoria(id, direccion) {
  const categorias = menuData.categorias.sort((a, b) => a.orden - b.orden);
  const index = categorias.findIndex(c => c.id === id);
  const newIndex = index + direccion;

  if (newIndex < 0 || newIndex >= categorias.length) return;

  // Intercambiar órdenes
  const temp = categorias[index].orden;
  categorias[index].orden = categorias[newIndex].orden;
  categorias[newIndex].orden = temp;

  marcarCambios();
  guardarEnLocalStorage();
  renderizarCategorias();
}

// === CONFIGURACIÓN ===
function guardarConfiguracion() {
  menuData.config = {
    nombreRestaurante: document.getElementById('config-nombre').value.trim(),
    slogan: document.getElementById('config-slogan').value.trim(),
    whatsapp: document.getElementById('config-whatsapp').value.trim(),
    telefono: document.getElementById('config-telefono').value.trim(),
    horario: document.getElementById('config-horario').value.trim(),
    diaCerrado: document.getElementById('config-diacerrado').value.trim(),
    desarrolladoPor: document.getElementById('config-desarrollador').value.trim()
  };

  marcarCambios();
  guardarEnLocalStorage();
  mostrarToast('Configuración guardada correctamente', 'success');
}

// === IMÁGENES ===
function cambiarTabImagen(tab) {
  document.querySelectorAll('.img-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.img-tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function obtenerImagenProducto() {
  // Verificar cuál tab está activo
  const activeTab = document.querySelector('.img-tab.active').dataset.tab;

  if (activeTab === 'url') {
    return document.getElementById('producto-imagen-url').value.trim() || null;
  } else if (activeTab === 'local') {
    return document.getElementById('producto-imagen-local').value.trim() || null;
  } else if (activeTab === 'upload') {
    const previewImg = document.getElementById('preview-img');
    return previewImg.src && previewImg.src.startsWith('data:') ? previewImg.src : null;
  }

  return null;
}

function previewImagen(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > MAX_IMAGE_SIZE) {
    mostrarToast(`La imagen es muy grande. Máximo ${MAX_IMAGE_SIZE / 1024}KB`, 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    mostrarPreviewImagen(e.target.result);
  };
  reader.readAsDataURL(file);
}

function mostrarPreviewImagen(src) {
  const preview = document.getElementById('imagen-preview');
  const img = document.getElementById('preview-img');
  img.src = src;
  preview.classList.add('active');
}

function ocultarPreviewImagen() {
  const preview = document.getElementById('imagen-preview');
  const img = document.getElementById('preview-img');
  img.src = '';
  preview.classList.remove('active');
}

function eliminarImagen() {
  document.getElementById('producto-imagen-url').value = '';
  document.getElementById('producto-imagen-local').value = '';
  document.getElementById('producto-imagen-file').value = '';
  ocultarPreviewImagen();
}

// === EXPORTAR / IMPORTAR ===

// Exportar JSON (nombre fijo)
function exportarJSON() {
  const dataStr = JSON.stringify(menuData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'menu-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  mostrarToast('Archivo menu-data.json exportado. Súbelo a la carpeta "data" en GitHub.', 'success');
}

// Importar JSON
function importarJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      // Validar estructura básica
      if (!data.config || !data.categorias || !data.productos) {
        throw new Error('Estructura de datos inválida');
      }

      menuData = data;
      marcarCambios();
      guardarEnLocalStorage();
      renderizarTodo();
      mostrarToast('Datos importados correctamente', 'success');
    } catch (error) {
      mostrarToast('Error al importar: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);

  // Limpiar input
  event.target.value = '';
}

// Sincronizar con Supabase (recargar datos desde la nube)
async function sincronizarConSupabase() {
  if (cambiosPendientes) {
    const confirmar = confirm('Tienes cambios sin guardar. Si sincronizas ahora, se perderán.\n\n¿Deseas continuar?');
    if (!confirmar) return;
  }

  actualizarIndicadorEstado('saving');
  mostrarToast('Sincronizando con la nube...', 'info');

  try {
    if (!modoOffline && typeof SupabaseDB !== 'undefined') {
      menuData = await SupabaseDB.cargarMenuCompleto(false);
      guardarEnLocalStorage();
      finalizarCarga();
      renderizarTodo();
      actualizarIndicadorEstado('saved');
      mostrarToast('Sincronizado con la nube correctamente', 'success');
    } else {
      throw new Error('Supabase no disponible');
    }
  } catch (error) {
    console.error('Error sincronizando:', error);
    actualizarIndicadorEstado('');
    mostrarToast('Error al sincronizar. Verifica tu conexión.', 'error');
  }
}

// Resetear datos y forzar sincronización limpia
async function resetearYSincronizar() {
  const confirmar = confirm('⚠️ ATENCIÓN: Esto eliminará todos los datos actuales y los reemplazará con los datos por defecto.\n\n¿Estás seguro?');
  if (!confirmar) return;

  actualizarIndicadorEstado('saving');
  mostrarToast('Reseteando datos...', 'info');

  try {
    // Cargar datos por defecto
    menuData = obtenerDatosCompletos();

    // Limpiar localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Sincronizar a Supabase
    if (!modoOffline && typeof SupabaseDB !== 'undefined') {
      await SupabaseDB.guardarMenuCompleto(menuData);
      mostrarToast('Datos reseteados y sincronizados a la nube', 'success');
    } else {
      mostrarToast('Datos reseteados localmente', 'success');
    }

    guardarEnLocalStorage();
    finalizarCarga();
    renderizarTodo();
    actualizarIndicadorEstado('saved');
  } catch (error) {
    console.error('Error reseteando datos:', error);
    mostrarToast('Error al resetear. Intenta de nuevo.', 'error');
  }
}

// === MODALES DE CONFIRMACIÓN ===
function mostrarConfirmacion(mensaje, callback) {
  document.getElementById('confirm-message').textContent = mensaje;
  confirmCallback = callback;
  document.getElementById('modal-confirm').classList.add('active');
}

function cerrarModalConfirm() {
  document.getElementById('modal-confirm').classList.remove('active');
  confirmCallback = null;
}

function confirmarAccion() {
  if (confirmCallback) {
    confirmCallback();
  }
  cerrarModalConfirm();
}

// === TOAST NOTIFICATIONS ===
function mostrarToast(mensaje, tipo = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;

  const iconos = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `<span>${iconos[tipo]}</span> ${mensaje}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === CERRAR MODALES CON ESC ===
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }
});

// === CERRAR MODALES CON CLIC EXTERIOR ===
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('active');
    }
  });
});
