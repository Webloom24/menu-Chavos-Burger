/* ============================================
   CHAVOS BURGER - JAVASCRIPT PREMIUM
   Funcionalidades avanzadas con UX intuitiva
   ============================================ */

// === ESTADO GLOBAL ===
let carrito = [];
let productoActual = null;
let ingredientesActuales = [];

// === WIZARD DE 3 FASES ===
let wizardFaseActual = 1;
let wizardCantidad = 1;
let wizardConfiguraciones = []; // Array de configuraciones [{ ingredientes: [...], ingredientesEliminados: [...] }]

// Número de WhatsApp (CAMBIAR POR EL REAL)
const WHATSAPP_NUMBER = "573183752974";

// === INICIALIZACIÓN ===
document.addEventListener("DOMContentLoaded", function () {
  inicializarBuscador();
  inicializarFiltros();
  inicializarNavegacion();
  inicializarCardPedido();
  cargarCarritoDesdeLocalStorage();
  animarElementos();
});
function inicializarBuscador() {
  const buscador = document.getElementById("buscador");
  const resultadoTexto = document.getElementById("resultado-busqueda");

  buscador.addEventListener("input", function () {
    const textoBusqueda = this.value.toLowerCase().trim();
    const productos = document.querySelectorAll(".product-card");
    let productosEncontrados = 0;

    productos.forEach(function (producto) {
      const nombre = producto
        .querySelector(".product-name")
        .textContent.toLowerCase();
      const descripcion = producto
        .querySelector(".product-description")
        .textContent.toLowerCase();

      if (
        nombre.includes(textoBusqueda) ||
        descripcion.includes(textoBusqueda)
      ) {
        producto.style.display = "block";
        producto.style.animation = "fadeInScale 0.3s ease-out";
        productosEncontrados++;
      } else {
        producto.style.display = "none";
      }
    });

    // Mostrar resultado
    if (textoBusqueda === "") {
      resultadoTexto.textContent = "";
    } else if (productosEncontrados === 0) {
      resultadoTexto.textContent =
        "😕 No se encontraron productos con ese nombre";
      resultadoTexto.style.color = "#C23D1F";
    } else {
      resultadoTexto.textContent = `✅ ${productosEncontrados} producto(s) encontrado(s)`;
      resultadoTexto.style.color = "#25D366";
    }
  });
}

// === FILTROS POR PRECIO ===
function inicializarFiltros() {
  const filtros = document.querySelectorAll(".filter-btn");

  filtros.forEach(function (filtro) {
    filtro.addEventListener("click", function () {
      // Remover active de todos
      filtros.forEach((f) => f.classList.remove("active"));
      // Agregar active al clickeado
      this.classList.add("active");

      const categoria = this.getAttribute("data-filter");
      const productos = document.querySelectorAll(".product-card");

      productos.forEach(function (producto) {
        if (categoria === "todos") {
          producto.style.display = "block";
          producto.style.animation = "fadeInScale 0.3s ease-out";
        } else {
          const productoCategoria = producto.getAttribute("data-category");
          if (productoCategoria === categoria) {
            producto.style.display = "block";
            producto.style.animation = "fadeInScale 0.3s ease-out";
          } else {
            producto.style.display = "none";
          }
        }
      });
    });
  });
}

// === NAVEGACIÓN ACTIVA ===
function inicializarNavegacion() {
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".menu-section");

  window.addEventListener("scroll", function () {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollY >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + current) {
        link.classList.add("active");
      }
    });
  });
}

// === CARD DE PEDIDO ===
function inicializarCardPedido() {
  // Event listeners para botones de tipo de pedido
  document.querySelectorAll(".tipo-option").forEach((btn) => {
    btn.addEventListener("click", function () {
      seleccionarTipoPedido(this.getAttribute("data-tipo"));
    });
  });

  // Event listener para cerrar card con overlay
  document
    .getElementById("pedido-card")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        cerrarCardPedido();
      }
    });
}

// === MODAL DE PRODUCTO ===
function abrirModal(boton) {
  const card = boton.closest(".product-card");
  const nombre = card.querySelector(".product-name").textContent;
  const descripcion = card.querySelector(".product-description").textContent;
  const precioTexto = card.querySelector(".product-price").textContent;
  const precio = parseInt(precioTexto.replace(/\D/g, ""));

  // Obtener la categoría del producto desde la sección
  const section = card.closest(".menu-section");
  const categoria = section ? section.getAttribute("data-section") : "";

  // Guardar producto actual
  productoActual = {
    nombre: nombre,
    descripcion: descripcion,
    precio: precio,
    precioOriginal: precio,
    categoria: categoria,
  };

  // Llenar modal
  document.getElementById("modal-nombre").textContent = nombre;
  document.getElementById("modal-precio").textContent = precioTexto;

  // Generar lista de ingredientes para usar después
  generarIngredientes(descripcion);

  // Iniciar wizard en fase 1
  iniciarWizard();

  // Mostrar modal
  document.getElementById("modal").classList.add("active");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function cerrarModal() {
  document.getElementById("modal").classList.remove("active");
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "auto";
  productoActual = null;
  ingredientesActuales = [];
  resetearWizard();
}

// === WIZARD DE 3 FASES ===

function iniciarWizard() {
  wizardFaseActual = 1;
  wizardCantidad = 1;
  wizardConfiguraciones = [];

  document.getElementById("wizard-cantidad").value = 1;
  mostrarFase(1);
}

function resetearWizard() {
  wizardFaseActual = 1;
  wizardCantidad = 1;
  wizardConfiguraciones = [];
}

function mostrarFase(numeroFase) {
  // Ocultar todas las fases
  document.getElementById("fase-cantidad").style.display = "none";
  document.getElementById("fase-personalizacion").style.display = "none";
  document.getElementById("fase-resumen").style.display = "none";

  // Mostrar la fase actual
  if (numeroFase === 1) {
    document.getElementById("fase-cantidad").style.display = "block";
  } else if (numeroFase === 2) {
    document.getElementById("fase-personalizacion").style.display = "block";
  } else if (numeroFase === 3) {
    document.getElementById("fase-resumen").style.display = "block";
  }

  wizardFaseActual = numeroFase;

  // Hacer scroll al inicio del modal - múltiples métodos para asegurar compatibilidad
  setTimeout(() => {
    // Método 1: scroll en modal-content
    const modalContent = document.querySelector("#modal .modal-content");
    if (modalContent) {
      modalContent.scrollTop = 0;
    }

    // Método 2: scroll en modal-body
    const modalBody = document.querySelector("#modal .modal-body");
    if (modalBody) {
      modalBody.scrollTop = 0;
    }

    // Método 3: scroll en window si es móvil
    window.scrollTo(0, 0);
  }, 50);
}

function cambiarCantidadWizard(cambio) {
  const input = document.getElementById("wizard-cantidad");
  let cantidad = parseInt(input.value);
  cantidad += cambio;

  if (cantidad < 1) cantidad = 1;
  if (cantidad > 10) cantidad = 10;

  input.value = cantidad;
  wizardCantidad = cantidad;
}

function cancelarWizard() {
  if (wizardFaseActual > 1) {
    const confirmar = confirm("¿Seguro que deseas cancelar? Se perderá todo el progreso.");
    if (!confirmar) return;
  }
  cerrarModal();
}

// FASE 2: Generar tarjetas de personalización
function irAFase2() {
  wizardCantidad = parseInt(document.getElementById("wizard-cantidad").value);

  // Inicializar configuraciones vacías
  wizardConfiguraciones = [];
  for (let i = 0; i < wizardCantidad; i++) {
    wizardConfiguraciones.push({
      ingredientes: [...ingredientesActuales],
      ingredientesEliminados: []
    });
  }

  // Generar HTML de personalización
  const container = document.getElementById("productos-personalizar");
  container.innerHTML = "";

  for (let i = 0; i < wizardCantidad; i++) {
    const div = document.createElement("div");
    div.className = "producto-personalizar";

    let ingredientesHTML = "";
    ingredientesActuales.forEach((ingrediente, j) => {
      ingredientesHTML += `
        <div class="ingrediente-item">
          <label>
            <input
              type="checkbox"
              class="ingrediente-checkbox"
              data-producto="${i}"
              data-ingrediente="${j}"
              checked
              onchange="toggleIngredienteWizard(${i}, ${j}, this.checked)"
            />
            <span>${ingrediente.nombre}</span>
          </label>
        </div>
      `;
    });

    div.innerHTML = `
      <div class="producto-header">
        <span class="producto-icono">🍔</span>
        <span class="producto-numero">#${i + 1}</span>
      </div>
      <div class="producto-ingredientes">
        ${ingredientesHTML}
      </div>
    `;

    container.appendChild(div);
  }

  mostrarFase(2);
}

function toggleIngredienteWizard(productoIndex, ingredienteIndex, incluido) {
  const ingrediente = ingredientesActuales[ingredienteIndex];

  // Actualizar estado
  wizardConfiguraciones[productoIndex].ingredientes[ingredienteIndex].incluido = incluido;

  // Actualizar lista de eliminados
  if (!incluido) {
    if (!wizardConfiguraciones[productoIndex].ingredientesEliminados.includes(ingrediente.nombre)) {
      wizardConfiguraciones[productoIndex].ingredientesEliminados.push(ingrediente.nombre);
    }
  } else {
    const index = wizardConfiguraciones[productoIndex].ingredientesEliminados.indexOf(ingrediente.nombre);
    if (index > -1) {
      wizardConfiguraciones[productoIndex].ingredientesEliminados.splice(index, 1);
    }
  }

  // Actualizar estilos visuales
  const checkbox = document.querySelector(`[data-producto="${productoIndex}"][data-ingrediente="${ingredienteIndex}"]`);
  const label = checkbox.closest("label");
  if (label) {
    label.style.opacity = incluido ? "1" : "0.5";
    label.style.textDecoration = incluido ? "none" : "line-through";
  }
}

// FASE 3: Mostrar resumen
function irAFase3() {
  const container = document.getElementById("resumen-final");

  let resumenHTML = '<div class="resumen-items">';
  let total = 0;

  wizardConfiguraciones.forEach((config, i) => {
    const precio = productoActual.precio;
    total += precio;

    let detalles = "";
    if (config.ingredientesEliminados.length > 0) {
      detalles = `❌ Sin: ${config.ingredientesEliminados.join(", ")}`;
    } else {
      detalles = "✅ Completa";
    }

    const sinIngredientes = config.ingredientesEliminados.length > 0;

    resumenHTML += `
      <div class="resumen-item-final ${sinIngredientes ? 'sin-ingredientes' : ''}">
        <div class="resumen-item-info">
          <div class="resumen-item-cantidad">🍔 #${i + 1}</div>
          <div class="resumen-item-detalles">${detalles}</div>
        </div>
        <div class="resumen-item-precio">$${precio.toLocaleString("es-CO")}</div>
      </div>
    `;
  });

  resumenHTML += '</div>';

  resumenHTML += `
    <div class="resumen-total">
      <div class="resumen-total-label">Total ${wizardCantidad} producto${wizardCantidad > 1 ? 's' : ''}</div>
      <div class="resumen-total-precio">$${total.toLocaleString("es-CO")}</div>
    </div>
  `;

  container.innerHTML = resumenHTML;
  mostrarFase(3);
}

function volverAFase2() {
  mostrarFase(2);
}

function confirmarPedidoWizard() {
  if (!productoActual) return;

  // Agregar cada configuración al carrito
  wizardConfiguraciones.forEach((config) => {
    const ingredientesSeleccionados = config.ingredientes
      .filter(i => i.incluido)
      .map(i => i.nombre)
      .join(", ");

    const item = {
      id: Date.now() + Math.random(),
      nombre: productoActual.nombre,
      precio: productoActual.precio,
      cantidad: 1,
      ingredientes: ingredientesSeleccionados,
      ingredientesEliminados: config.ingredientesEliminados,
      subtotal: productoActual.precio,
      categoria: productoActual.categoria,
    };

    carrito.push(item);
  });

  guardarCarritoEnLocalStorage();
  actualizarCarritoUI();
  cerrarModal();

  mostrarNotificacion(
    `✅ ${wizardCantidad} producto${wizardCantidad > 1 ? 's' : ''} agregado${wizardCantidad > 1 ? 's' : ''} al carrito`,
    "success"
  );

  // Abrir carrito automáticamente
  setTimeout(() => {
    toggleCarrito();
  }, 400);
}

// === GENERADOR DE INGREDIENTES ===
function generarIngredientes(descripcion) {
  // Solo preparar datos de ingredientes, el wizard se encarga del HTML
  const ingredientes = descripcion.split(",").map((i) => i.trim());
  ingredientesActuales = [];

  ingredientes.forEach((ingrediente) => {
    ingredientesActuales.push({
      nombre: ingrediente,
      incluido: true,
    });
  });
}

// === CARRITO ===

function actualizarCarritoUI() {
  const carritoItems = document.getElementById("carrito-items");
  const cartCount = document.getElementById("cart-count");
  const cartBadgeTop = document.getElementById("cart-badge-top");
  const cartFixedBtn = document.getElementById("cart-fixed-btn");
  const carritoTotal = document.getElementById("carrito-total");

  // Actualizar contador
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // Actualizar contador del hero
  cartCount.textContent = totalItems;
  if (totalItems > 0) {
    cartCount.style.display = "flex";
  } else {
    cartCount.style.display = "none";
  }

  // Actualizar botón fijo superior
  if (cartBadgeTop) {
    cartBadgeTop.textContent = totalItems;
  }

  if (cartFixedBtn) {
    if (totalItems > 0) {
      cartFixedBtn.classList.add("visible");
    } else {
      cartFixedBtn.classList.remove("visible");
    }
  }

  // Actualizar items
  if (carrito.length === 0) {
    carritoItems.innerHTML = `
      <div class="carrito-empty">
        <p>Tu carrito está vacío</p>
        <p class="carrito-empty-subtitle">Agrega productos para comenzar</p>
      </div>
    `;
    carritoTotal.textContent = "$0";
    return;
  }

  carritoItems.innerHTML = "";
  let total = 0;

  // Agrupar productos por nombre para detectar múltiples configuraciones
  const productosAgrupados = {};
  carrito.forEach((item) => {
    if (!productosAgrupados[item.nombre]) {
      productosAgrupados[item.nombre] = [];
    }
    productosAgrupados[item.nombre].push(item);
  });

  carrito.forEach((item) => {
    total += item.subtotal;

    const div = document.createElement("div");
    div.className = "carrito-item";

    // Verificar si hay múltiples configuraciones del mismo producto
    const configuraciones = productosAgrupados[item.nombre];
    const numeroConfiguracion = configuraciones.findIndex((p) => p.id === item.id) + 1;
    const hayMultiplesConfigs = configuraciones.length > 1;

    let configBadge = "";
    if (hayMultiplesConfigs) {
      configBadge = `<span class="config-badge">Config ${numeroConfiguracion}/${configuraciones.length}</span>`;
    }

    let modificaciones = "";
    if (item.ingredientesEliminados.length > 0) {
      modificaciones = `<div style="font-size: 12px; color: #C23D1F; margin-top: 4px;">❌ Sin: ${item.ingredientesEliminados.join(", ")}</div>`;
    } else {
      modificaciones = `<div style="font-size: 12px; color: #25D366; margin-top: 4px;">✅ Completa</div>`;
    }

    div.innerHTML = `
      <div class="carrito-item-header">
        <div class="carrito-item-name">
          ${item.nombre}
          ${configBadge}
        </div>
        <div class="carrito-item-actions">
          <button class="carrito-item-duplicate" onclick="duplicarProducto(${item.id})" title="Duplicar esta configuración">📋</button>
          <button class="carrito-item-edit" onclick="editarProducto(${item.id})" title="Editar esta configuración">✏️</button>
          <button class="carrito-item-remove" onclick="eliminarDelCarrito(${item.id})" title="Eliminar esta configuración">×</button>
        </div>
      </div>
      <div class="carrito-item-details">${modificaciones}</div>
      <div class="carrito-item-footer">
        <div class="carrito-item-qty">🔢 Cantidad: ${item.cantidad}</div>
        <div class="carrito-item-price">$${item.subtotal.toLocaleString("es-CO")}</div>
      </div>
    `;

    carritoItems.appendChild(div);
  });

  carritoTotal.textContent = `$${total.toLocaleString("es-CO")}`;
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter((item) => item.id !== id);
  guardarCarritoEnLocalStorage();
  actualizarCarritoUI();
  mostrarNotificacion("Producto eliminado del carrito", "warning");
}

function duplicarProducto(id) {
  const itemOriginal = carrito.find((item) => item.id === id);
  if (!itemOriginal) return;

  // Crear copia del producto con nuevo ID
  const itemDuplicado = {
    ...itemOriginal,
    id: Date.now(), // Nuevo ID único
  };

  carrito.push(itemDuplicado);
  guardarCarritoEnLocalStorage();
  actualizarCarritoUI();
  mostrarNotificacion("Producto duplicado en el carrito", "info");
}

function vaciarCarrito() {
  if (carrito.length === 0) return;

  if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
    carrito = [];
    guardarCarritoEnLocalStorage();
    actualizarCarritoUI();
    mostrarNotificacion("Carrito vaciado", "warning");
  }
}

function toggleCarrito() {
  const sidebar = document.getElementById("carrito-sidebar");
  const overlay = document.getElementById("overlay");

  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");

  if (sidebar.classList.contains("active")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
}

// Función para seguir explorando productos
function seguirExplorando() {
  // Cerrar el carrito
  toggleCarrito();

  // Hacer scroll hacia la sección de filtros después de un pequeño delay
  setTimeout(() => {
    const searchSection = document.querySelector(".search-filter-section");
    if (searchSection) {
      searchSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 300);
}

// === CARD DE PEDIDO ===

// Variables globales para el pedido
let tipoPedidoSeleccionado = null;

// Mostrar card de pedido
function mostrarCardPedido() {
  if (carrito.length === 0) {
    alert("Tu carrito está vacío. Agrega productos antes de hacer el pedido.");
    return;
  }

  // Resetear formulario
  tipoPedidoSeleccionado = null;
  document.getElementById("cliente-nombre").value = "";
  document.getElementById("cliente-direccion").value = "";
  document.getElementById("cliente-barrio").value = "";
  document.getElementById("cliente-especificaciones").value = "";

  // Ocultar campos de domicilio inicialmente
  document.getElementById("campos-domicilio").style.display = "none";

  // Remover clases activas de opciones
  document.querySelectorAll(".tipo-option").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Ocultar mensaje de validación
  document.getElementById("validacion-mensaje").style.display = "none";

  // Mostrar card
  document.getElementById("pedido-card").classList.add("active");
}

// Cerrar card de pedido
function cerrarCardPedido() {
  document.getElementById("pedido-card").classList.remove("active");
}

// Seleccionar tipo de pedido
function seleccionarTipoPedido(tipo) {
  tipoPedidoSeleccionado = tipo;

  // Remover clase active de todas las opciones
  document.querySelectorAll(".tipo-option").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Agregar clase active al botón seleccionado
  event.target.classList.add("active");

  // Mostrar/ocultar campos de domicilio
  const camposDomicilio = document.getElementById("campos-domicilio");
  if (tipo === "domicilio") {
    camposDomicilio.style.display = "block";
  } else {
    camposDomicilio.style.display = "none";
  }

  // Ocultar mensaje de validación
  document.getElementById("validacion-mensaje").style.display = "none";
}

// Validar formulario
function validarFormulario() {
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const validacionMensaje = document.getElementById("validacion-mensaje");

  // Ocultar mensaje anterior
  validacionMensaje.style.display = "none";
  validacionMensaje.className = "validacion-mensaje";

  // Validar tipo de pedido
  if (!tipoPedidoSeleccionado) {
    mostrarMensajeValidacion(
      "Por favor selecciona un tipo de pedido.",
      "error",
    );
    return false;
  }

  // Validar nombre
  if (!nombre) {
    mostrarMensajeValidacion("Por favor ingresa tu nombre completo.", "error");
    return false;
  }

  // Validar campos de domicilio si es seleccionado
  if (tipoPedidoSeleccionado === "domicilio") {
    const direccion = document.getElementById("cliente-direccion").value.trim();
    const barrio = document.getElementById("cliente-barrio").value.trim();

    if (!direccion) {
      mostrarMensajeValidacion(
        "Por favor ingresa tu dirección completa.",
        "error",
      );
      return false;
    }

    if (!barrio) {
      mostrarMensajeValidacion(
        "Por favor ingresa tu barrio o sector.",
        "error",
      );
      return false;
    }
  }

  return true;
}

// Mostrar mensaje de validación
function mostrarMensajeValidacion(mensaje, tipo) {
  const validacionMensaje = document.getElementById("validacion-mensaje");
  validacionMensaje.textContent = mensaje;
  validacionMensaje.classList.add(tipo);
  validacionMensaje.style.display = "block";
}

// === WHATSAPP ===
function enviarPedidoWhatsApp() {
  // Validar formulario
  if (!validarFormulario()) {
    return;
  }

  // Obtener datos del formulario
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const direccion = document.getElementById("cliente-direccion").value.trim();
  const barrio = document.getElementById("cliente-barrio").value.trim();
  const especificaciones = document
    .getElementById("cliente-especificaciones")
    .value.trim();

  // Obtener saludo según la hora
  const ahora = new Date();
  const hora = ahora.getHours();

  let saludo = "Buenas tardes";
  if (hora >= 19) {
    saludo = "Buenas noches";
  } else if (hora < 12) {
    saludo = "Buenos días";
  }

  // Construir mensaje con información del cliente
  let mensaje = `Hola 👋 ${saludo}.\n\n`;
  mensaje += `Soy *${nombre}* y quisiera realizar el siguiente pedido en *Chavos Burger* 🍔:\n\n`;

  // Función para obtener el nombre del tipo de producto
  const obtenerTipoProducto = (categoria) => {
    const tipos = {
      'burgers': 'hamburguesas',
      'perros': 'perros',
      'salchipapas': 'salchipapas',
      'delicias': 'delicias',
      'sandwich': 'sándwiches',
      'desgranados': 'desgranados'
    };
    return tipos[categoria] || 'productos';
  };

  // Agrupar productos por nombre
  const productosAgrupados = {};
  carrito.forEach((item) => {
    if (!productosAgrupados[item.nombre]) {
      productosAgrupados[item.nombre] = {
        precio: item.precio,
        categoria: item.categoria,
        variaciones: {},
        totalCantidad: 0,
        subtotalGeneral: 0
      };
    }

    // Crear clave para la variación (ingredientes eliminados)
    const claveVariacion = item.ingredientesEliminados.length > 0
      ? item.ingredientesEliminados.sort().join(", ")
      : "normal";

    if (!productosAgrupados[item.nombre].variaciones[claveVariacion]) {
      productosAgrupados[item.nombre].variaciones[claveVariacion] = {
        cantidad: 0,
        ingredientesEliminados: item.ingredientesEliminados
      };
    }

    productosAgrupados[item.nombre].variaciones[claveVariacion].cantidad += item.cantidad;
    productosAgrupados[item.nombre].totalCantidad += item.cantidad;
    productosAgrupados[item.nombre].subtotalGeneral += item.subtotal;
  });

  // Construir mensaje con productos agrupados
  Object.keys(productosAgrupados).forEach((nombreProducto) => {
    const producto = productosAgrupados[nombreProducto];
    const tipoProducto = obtenerTipoProducto(producto.categoria);
    const tipoProductoSingular = producto.categoria === 'burgers' ? 'hamburguesa' :
                                  producto.categoria === 'perros' ? 'perro' :
                                  producto.categoria === 'salchipapas' ? 'salchipapa' :
                                  producto.categoria === 'delicias' ? 'delicia' :
                                  producto.categoria === 'sandwich' ? 'sándwich' :
                                  producto.categoria === 'desgranados' ? 'desgranado' : 'producto';

    mensaje += `📌 *${nombreProducto}:* ${producto.totalCantidad} ${producto.totalCantidad > 1 ? tipoProducto : tipoProductoSingular}\n`;
    mensaje += `💲 *Precio unitario:* $${producto.precio.toLocaleString("es-CO")}\n`;

    // Mostrar variaciones
    const variaciones = producto.variaciones;
    mensaje += `Especificación del pedido:\n`;

    Object.keys(variaciones).forEach((claveVariacion) => {
      const variacion = variaciones[claveVariacion];
      if (claveVariacion === "normal") {
        mensaje += `   • ${variacion.cantidad} ${tipoProductoSingular} ${nombreProducto} normal${variacion.cantidad > 1 ? 'es' : ''}\n`;
      } else {
        mensaje += `   • ${variacion.cantidad} ${tipoProductoSingular} ${nombreProducto} sin ${variacion.ingredientesEliminados.join(", ")}\n`;
      }
    });

    mensaje += `🧾 *Subtotal:* $${producto.subtotalGeneral.toLocaleString("es-CO")}\n\n`;
  });

  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  mensaje += `💰 *Total a pagar:* $${total.toLocaleString("es-CO")}\n\n`;

  // Tipo de pedido
  switch (tipoPedidoSeleccionado) {
    case "recoger":
      mensaje += `🏪 *Tipo de pedido:* El pedido es para pasar a recoger en el local.\n\n`;
      break;
    case "domicilio":
      mensaje += `🏠 *Tipo de pedido:* El pedido es para envío a domicilio.\n`;
      mensaje += `📍 *Dirección:* ${direccion}\n`;
      mensaje += `🏘️ *Barrio:* ${barrio}\n`;
      if (especificaciones) {
        mensaje += `📝 *Especificaciones:* ${especificaciones}\n`;
      }
      mensaje += `\n`;
      break;
    case "local":
      mensaje += `🍽️ *Tipo de pedido:* El pedido es para consumir en el establecimiento.\n\n`;
      break;
  }

  mensaje += `¿Podrían confirmarme por favor si hay disponibilidad?\n¡Muchas gracias!`;

  // Codificar y abrir WhatsApp
  const mensajeCodificado = encodeURIComponent(mensaje);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeCodificado}`;

  // Cerrar card y abrir WhatsApp
  cerrarCardPedido();
  window.open(url, "_blank");

  // Mostrar mensaje de éxito
  mostrarMensajeValidacion(
    "¡Pedido enviado exitosamente! Te contactaremos pronto.",
    "success",
  );
  setTimeout(() => {
    document.getElementById("validacion-mensaje").style.display = "none";
  }, 3000);
}

// Variables globales para edición
let productoEditando = null;
let ingredientesEditando = [];

// === EDICIÓN DE PRODUCTOS ===
function editarProducto(id) {
  const item = carrito.find((item) => item.id === id);
  if (!item) return;

  productoEditando = { ...item };

  // Llenar modal de edición
  document.getElementById("edit-modal-nombre").textContent =
    `Editar ${item.nombre}`;
  document.getElementById("edit-modal-precio").textContent =
    `$${item.precio.toLocaleString("es-CO")}`;
  document.getElementById("edit-modal-descripcion").textContent =
    item.ingredientes;
  document.getElementById("edit-modal-cantidad").value = item.cantidad;

  // Generar lista de ingredientes para edición
  generarIngredientesEdicion(item);

  // Calcular subtotal inicial
  actualizarEditSubtotal();

  // Mostrar modal
  document.getElementById("edit-modal").classList.add("active");
}

function generarIngredientesEdicion(item) {
  const container = document.getElementById("edit-modal-ingredientes");
  container.innerHTML = "";

  // Obtener ingredientes originales del producto
  const descripcion = item.ingredientes;
  const ingredientes = descripcion.split(", ").map((ing) => ing.trim());

  ingredientesEditando = [];

  ingredientes.forEach((ingrediente, index) => {
    const div = document.createElement("div");
    div.className = "ingrediente-item";

    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "12px";
    label.style.cursor = "pointer";
    label.style.flex = "1";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "ingrediente-checkbox";
    checkbox.id = `edit-ingrediente-${index}`;

    // Verificar si el ingrediente está incluido (no está en eliminados)
    const estaIncluido = !item.ingredientesEliminados.includes(ingrediente);
    checkbox.checked = estaIncluido;

    const span = document.createElement("span");
    span.textContent = ingrediente;
    span.style.flex = "1";

    if (!estaIncluido) {
      span.style.opacity = "0.5";
      span.style.textDecoration = "line-through";
    }

    label.appendChild(checkbox);
    label.appendChild(span);
    div.appendChild(label);
    container.appendChild(div);

    // Guardar estado
    ingredientesEditando.push({
      nombre: ingrediente,
      incluido: estaIncluido,
    });

    // Event listener
    checkbox.addEventListener("change", function () {
      ingredientesEditando[index].incluido = this.checked;
      span.style.opacity = this.checked ? "1" : "0.5";
      span.style.textDecoration = this.checked ? "none" : "line-through";
      actualizarEditSubtotal();
    });
  });
}

function cambiarEditCantidad(cambio) {
  const input = document.getElementById("edit-modal-cantidad");
  let cantidad = parseInt(input.value);
  cantidad += cambio;

  if (cantidad < 1) cantidad = 1;
  if (cantidad > 10) cantidad = 10;

  input.value = cantidad;
  actualizarEditSubtotal();
}

function actualizarEditSubtotal() {
  if (!productoEditando) return;

  const cantidad = parseInt(
    document.getElementById("edit-modal-cantidad").value,
  );
  const subtotal = productoEditando.precio * cantidad;

  document.getElementById("edit-modal-subtotal").textContent =
    `$${subtotal.toLocaleString("es-CO")}`;
}

function guardarEdicionProducto() {
  if (!productoEditando) return;

  const cantidad = parseInt(
    document.getElementById("edit-modal-cantidad").value,
  );

  // Obtener ingredientes incluidos y eliminados
  const ingredientesIncluidos = ingredientesEditando
    .filter((i) => i.incluido)
    .map((i) => i.nombre)
    .join(", ");

  const ingredientesEliminados = ingredientesEditando
    .filter((i) => !i.incluido)
    .map((i) => i.nombre);

  // Verificar si existe otro producto idéntico (excluyendo el que estamos editando)
  const productoIdentico = carrito.find(
    (item) =>
      item.id !== productoEditando.id && // Excluir el producto que estamos editando
      item.nombre === productoEditando.nombre &&
      item.precio === productoEditando.precio &&
      item.ingredientes === ingredientesIncluidos &&
      JSON.stringify(item.ingredientesEliminados.sort()) ===
        JSON.stringify(ingredientesEliminados.sort()),
  );

  // Actualizar el producto editado
  const index = carrito.findIndex((item) => item.id === productoEditando.id);
  if (index !== -1) {
    if (productoIdentico) {
      // Si existe idéntico, combinar cantidades y eliminar el producto editado
      productoIdentico.cantidad += cantidad;
      productoIdentico.subtotal =
        productoIdentico.precio * productoIdentico.cantidad;
      carrito.splice(index, 1); // Eliminar el producto editado
      mostrarNotificacion("Productos combinados por configuración idéntica", "info");
    } else {
      // Si no existe idéntico, actualizar normalmente
      carrito[index].cantidad = cantidad;
      carrito[index].ingredientes = ingredientesIncluidos;
      carrito[index].ingredientesEliminados = ingredientesEliminados;
      carrito[index].subtotal = productoEditando.precio * cantidad;
      mostrarNotificacion("Producto actualizado", "success");
    }

    guardarCarritoEnLocalStorage();
    actualizarCarritoUI();
    cerrarEditModal();
  }
}

function cerrarEditModal() {
  document.getElementById("edit-modal").classList.remove("active");
  productoEditando = null;
  ingredientesEditando = [];
}

function cancelarEdicion() {
  // Resetear los cambios sin guardar
  cerrarEditModal();
  mostrarNotificacion("Cambios descartados", "info");
}
function guardarCarritoEnLocalStorage() {
  localStorage.setItem("chavos-burger-carrito", JSON.stringify(carrito));
}

function cargarCarritoDesdeLocalStorage() {
  // Vaciar carrito al recargar la página
  carrito = [];
  localStorage.removeItem("chavos-burger-carrito");
  actualizarCarritoUI();
}

// === NOTIFICACIONES MEJORADAS ===
function mostrarNotificacion(mensaje, tipo = "success") {
  // Definir estilos según el tipo
  const estilos = {
    success: {
      background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
      icon: "✅",
    },
    info: {
      background: "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
      icon: "ℹ️",
    },
    warning: {
      background: "linear-gradient(135deg, #FFA726 0%, #FB8C00 100%)",
      icon: "⚠️",
    },
  };

  const estilo = estilos[tipo] || estilos.success;

  // Crear elemento de notificación
  const notif = document.createElement("div");
  notif.innerHTML = `<span style="margin-right: 8px;">${estilo.icon}</span>${mensaje}`;
  notif.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${estilo.background};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.4s ease-out;
    max-width: 350px;
    line-height: 1.4;
  `;

  document.body.appendChild(notif);

  // Eliminar después de 3.5 segundos
  setTimeout(() => {
    notif.style.animation = "slideOutRight 0.4s ease-out";
    setTimeout(() => {
      if (notif.parentNode) {
        document.body.removeChild(notif);
      }
    }, 400);
  }, 3500);
}

// === ANIMACIONES SCROLL ===
function animarElementos() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = "fadeInUp 0.6s ease-out";
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".menu-section").forEach((section) => {
    observer.observe(section);
  });
}

// === CERRAR CON ESC ===
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    cerrarModal();
    const sidebar = document.getElementById("carrito-sidebar");
    if (sidebar.classList.contains("active")) {
      toggleCarrito();
    }
    // Cerrar menú flotante también
    const menu = document.getElementById("floating-menu");
    if (menu && menu.classList.contains("active")) {
      toggleFloatingMenu();
    }
  }
});

// === CERRAR OVERLAY ===
document.getElementById("overlay").addEventListener("click", function () {
  cerrarModal();
  const sidebar = document.getElementById("carrito-sidebar");
  if (sidebar.classList.contains("active")) {
    toggleCarrito();
  }
});

// === ANIMACIÓN DE ENTRADA CSS ===
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;
document.head.appendChild(style);

/* ============================================
   BOTÓN FLOTANTE DE NAVEGACIÓN
   ============================================ */

// Mostrar/ocultar botón flotante al hacer scroll
window.addEventListener("scroll", function () {
  const floatingBtn = document.getElementById("floating-nav-btn");
  const navbar = document.querySelector(".navbar");

  if (!floatingBtn) return;

  // Obtener la posición del navbar
  const navbarBottom = navbar.offsetTop + navbar.offsetHeight;

  // Mostrar botón cuando el navbar ya no es visible
  if (window.scrollY > navbarBottom + 100) {
    floatingBtn.classList.add("visible");
  } else {
    floatingBtn.classList.remove("visible");
  }
});

// Toggle del menú flotante
function toggleFloatingMenu() {
  const menu = document.getElementById("floating-menu");
  const overlay = document.getElementById("floating-overlay");
  const btn = document.getElementById("floating-nav-btn");

  if (!menu || !overlay) return;

  const isActive = menu.classList.contains("active");

  if (isActive) {
    // Cerrar
    menu.classList.remove("active");
    overlay.classList.remove("active");
    btn.style.transform = "scale(1)";
  } else {
    // Abrir
    menu.classList.add("active");
    overlay.classList.add("active");
    btn.style.transform = "scale(0.9)";
  }
}

// Vaciar carrito al recargar o cerrar la página
window.addEventListener("beforeunload", function () {
  localStorage.removeItem("chavos-burger-carrito");
});

// También vaciar al cargar
window.addEventListener("load", function () {
  carrito = [];
  localStorage.removeItem("chavos-burger-carrito");
  actualizarCarritoUI();
});

console.log("🍔 Chavos Burger - Sistema cargado correctamente");
console.log(
  "📱 Para cambiar el número de WhatsApp, modifica la variable WHATSAPP_NUMBER en script.js",
);
console.log("🎯 Botón flotante de navegación cargado correctamente");
console.log("🛒 Botón de carrito fijo superior cargado correctamente");
