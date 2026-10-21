# DataFit

DataFit es una aplicación web para la gestión de inventario y dotación de uniformes y EPP de JAC Transportes & Buses Bío Bío. Centraliza el registro de trabajadores y tallas, el control de stock, los movimientos de bodega, las entregas y la planificación de compras de temporada.

- **Producción:** https://datafitjac.web.app/
- **Estado:** en desarrollo y pruebas.
- **Documentación completa:** [docs/DOCUMENTACION.md](docs/DOCUMENTACION.md)

## Funcionalidades principales

- **Inventario:** stock por prenda y talla, valorización, alertas de stock mínimo, ingresos, entregas y ajustes de auditoría.
- **Trabajadores:** registro y edición de fichas, tallas, estado de encuesta, estado de entrega, búsqueda y filtros por empresa, género y estado.
- **Movimientos:** historial de ingresos, entregas y ajustes, con exportación a CSV.
- **Plan de compra:** cálculo de demanda por talla, proyección de temporada, margen de seguridad, descuento de stock disponible, presupuesto y cronograma de adquisición.
- **Carga masiva:** importación de nóminas y matrices de inventario desde CSV, con detección de delimitador y tipo de archivo.
- **Exportación:** CSV de trabajadores, movimientos y plan de compra; integración preparada con Google Drive.
- **Sincronización:** datos compartidos en Firestore con actualización en tiempo real y guardado transaccional.
- **Autenticación local:** inicio de sesión y registro de usuarios almacenados en el navegador.
- **IA de compras:** análisis opcional mediante Gemini cuando se ejecuta el servidor Express con `GEMINI_API_KEY`; sin clave usa una respuesta heurística.

## Tecnologías

- React 19, TypeScript y Vite 8.
- Tailwind CSS 4.
- Express 4 para el servidor de desarrollo y la API opcional de IA.
- Firebase Firestore para la persistencia y Firebase Hosting para el despliegue.
- Firebase Authentication y Google Drive para la integración opcional con Drive.
- Recharts, Lucide React y Motion.
- Node.js 22 o superior en local; el CI usa Node.js 24.

## Inicio rápido

```bash
npm ci
npm run dev
```

La aplicación queda disponible en http://localhost:3000.

Credenciales de demostración definidas en `src/context/AuthContext.tsx`:

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `bodega` | `bodega2026` | Encargado |

> Importante: por defecto la aplicación escribe en el Firestore de producción `datafitjac`. Para probar guardados sin afectar datos compartidos, usa el emulador de Firestore descrito en la documentación. Evita las acciones de guardado, importación o restablecimiento si no estás conectado al emulador.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia Express con Vite en modo desarrollo en el puerto 3000. |
| `npm run build` | Compila el frontend y empaqueta el servidor en `dist/`. |
| `npm start` | Ejecuta el servidor compilado; requiere `NODE_ENV=production`. |
| `npm run preview` | Sirve únicamente el frontend compilado con Vite. |
| `npm run lint` | Valida TypeScript con `tsc --noEmit`. |
| `npm run test:state` | Ejecuta las pruebas de la capa de estado. |
| `npm run clean` | Elimina `dist` y `server.js`. |

## Estructura del proyecto

```text
.
├── src/
│   ├── components/        Vistas y modales de la interfaz
│   ├── context/           Estado global y autenticación local
│   ├── data/              Datos de ejemplo y datos oficiales en código
│   ├── hooks/             Hooks de integración con Firestore
│   ├── services/          Firestore, autenticación, Drive y CSV
│   ├── App.tsx            Composición principal de la aplicación
│   ├── main.tsx           Punto de entrada de React
│   ├── index.css          Estilos globales y Tailwind
│   └── types.ts           Modelo de datos TypeScript
├── tests/                 Pruebas de la capa de estado
├── docs/                  Documentación del proyecto
├── public/                Archivos estáticos
├── server.ts              Servidor Express y API opcional de IA
├── vite.config.ts         Configuración de Vite
├── firebase.json          Configuración de Firebase Hosting
├── .firebaserc            Proyecto Firebase por defecto
└── .github/workflows/     Despliegue y preview con GitHub Actions
```

## Firebase y despliegue

- Firestore de datos: proyecto `datafitjac`, colección `appState`.
- Autenticación de Google Drive: proyecto separado `pure-run-9mn89`.
- Hosting: `dist/`, con reescritura SPA hacia `index.html`.
- El despliegue a producción se ejecuta automáticamente al hacer merge a `main`.
- Los Pull Requests generan una URL de preview en Firebase Hosting.

Los detalles de arquitectura, modelo de datos, seguridad, plan Spark y operación están en [docs/DOCUMENTACION.md](docs/DOCUMENTACION.md).

## Pruebas

```bash
npm run test:state
npm run lint
```

Las pruebas actuales cubren la carga inicial sin escrituras, documentos ausentes, guardados explícitos, conflictos entre sesiones, JSON inválido, errores de lectura y edición durante un guardado pendiente. No existen pruebas de interfaz ni pruebas de extremo a extremo.

## Limitaciones conocidas

- La autenticación es local y las contraseñas se guardan sin hash en `localStorage`; no debe considerarse seguridad de producción.
- Las reglas de Firestore permiten lectura y escritura pública según la documentación existente del proyecto.
- Cada colección se guarda como un único documento JSON, con límite de 1 MiB por documento.
- No hay validación de tipos en tiempo de ejecución; TypeScript solo valida durante la compilación.
- La API de IA no se despliega en Firebase Hosting; solo funciona con el servidor Express local o con un backend adicional.
- Varias vistas y módulos existen en el código pero no están conectados a la navegación actual: Google Drive, panel de dashboard, entregas detalladas, autoregistro por QR y guardia de vistas protegidas.
- El portal de autoregistro y el QR apuntan a URLs antiguas de AI Studio/Cloud Run, no a `datafitjac.web.app`.

## Flujo de trabajo

1. Crear una rama desde `main`.
2. Desarrollar y probar localmente, preferentemente con el emulador de Firestore si se van a probar guardados.
3. Ejecutar `npm run lint`, `npm run test:state` y `npm run build`.
4. Abrir un Pull Request para generar la preview.
5. Hacer merge a `main` para desplegar a producción.
