# Chavos Burger - Menú Digital

Sistema de menú digital interactivo para Chavos Burger con carrito de compras y pedidos por WhatsApp.

## 📁 Estructura del Proyecto

```
Chavos Burger/
├── index.html              # Página principal
├── css/
│   └── styles.css         # Estilos del sitio
├── js/
│   └── script.js          # Lógica de la aplicación
├── images/
│   ├── hero-banner.png    # Banner principal
│   ├── patron-fondo.png   # Patrón de fondo
│   ├── icon-burgers.png   # Icono de hamburguesas
│   ├── icon-perros.png    # Icono de perros
│   ├── icon-salchipapas.png  # Icono de salchipapas
│   ├── icon-delicias.png  # Icono de delicias
│   ├── icon-sandwich.png  # Icono de sándwiches
│   └── icon-desgranados.png  # Icono de desgranados
└── README.md              # Este archivo
```

## 🚀 Características

- **Menú Interactivo**: Navegación por categorías (Burgers, Perros, Salchipapas, etc.)
- **Búsqueda y Filtros**: Búsqueda por nombre y filtros por rango de precio
- **Carrito de Compras**: Sistema de carrito con edición y duplicación de productos
- **Personalización**: Wizard de 3 pasos para personalizar ingredientes de cada producto
- **Pedidos WhatsApp**: Generación automática de mensajes pre-llenados con agrupación inteligente
- **Diseño Responsive**: Optimizado para dispositivos móviles y escritorio

## 📱 Uso

1. Abre `index.html` en tu navegador
2. Navega por las diferentes categorías de productos
3. Haz clic en "Agregar" para personalizar y añadir productos al carrito
4. Revisa tu pedido en el carrito
5. Haz clic en "Pedir por WhatsApp" para enviar tu pedido

## ⚙️ Configuración

Para cambiar el número de WhatsApp del negocio, edita la variable `WHATSAPP_NUMBER` en `js/script.js`:

```javascript
const WHATSAPP_NUMBER = "573001234567"; // Reemplaza con tu número
```

## 🎨 Personalización

- **Colores**: Edita las variables CSS en `css/styles.css` (sección `:root`)
- **Productos**: Edita las secciones de productos en `index.html`
- **Imágenes**: Reemplaza los archivos en la carpeta `images/`

## 📄 Licencia

Este proyecto fue desarrollado para Chavos Burger.

---
Desarrollado con ❤️ para Chavos Burger
