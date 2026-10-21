# Documentación técnica y funcional de DataFit

**Última revisión:** 20 de octubre de 2026

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y objetivos](#2-contexto-y-objetivos)
3. [Alcance y estado actual](#3-alcance-y-estado-actual)
4. [Glosario](#4-glosario)
5. [Arquitectura](#5-arquitectura)
6. [Funcionalidades](#6-funcionalidades)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Persistencia y sincronización](#8-persistencia-y-sincronización)
9. [Autenticación, roles y seguridad](#9-autenticación-roles-y-seguridad)
10. [Firebase: decisión técnica y plan Spark](#10-firebase-decisión-técnica-y-plan-spark)
11. [Desarrollo local](#11-desarrollo-local)
12. [Despliegue](#12-despliegue)
13. [Operación y mantenimiento](#13-operación-y-mantenimiento)
14. [Limitaciones y deuda técnica](#14-limitaciones-y-deuda-técnica)
15. [Traspaso a la empresa](#15-traspaso-a-la-empresa)
16. [Roadmap recomendado](#16-roadmap-recomendado)
17. [Referencias](#17-referencias)

---

## 1. Resumen ejecutivo

DataFit es una aplicación web para administrar inventario, dotación de uniformes y EPP de JAC Transportes & Buses Bío Bío. La aplicación permite registrar trabajadores y sus tallas, controlar stock por prenda y talla, registrar ingresos, entregas y ajustes, y calcular un plan de compra de temporada con proyección de demanda, margen de seguridad y descuento del stock disponible.

La aplicación está construida como una SPA de React con Vite. La persistencia compartida se realiza en Cloud Firestore y el frontend se publica en Firebase Hosting. El despliegue se automatiza con GitHub Actions al hacer merge a `main`. La API opcional de análisis de compras con Gemini se ejecuta en un servidor Express local, pero no forma parte del despliegue estático actual.

El uso previsto es interno y de baja frecuencia: principalmente la encargada de inventario, con actividad concentrada en fechas de gestión. Para ese volumen, el plan Spark de Firebase es suficiente; el riesgo principal no es la cuota de uso, sino el diseño de un único documento JSON por colección, las reglas de seguridad abiertas y la autenticación local.

---

## 2. Contexto y objetivos

### 2.1 Contexto

La empresa administra dotación permanente y de temporada estival. El proceso incluye:

- Recolectar tallas de trabajadores.
- Mantener inventario de prendas y calzado.
- Registrar ingresos de bodega, entregas y ajustes.
- Planificar compras de temporada.
- Generar respaldos y documentos de apoyo.

La aplicación busca centralizar ese proceso en una sola interfaz, evitando planillas dispersas y facilitando la consulta desde distintos dispositivos.

### 2.2 Objetivos

- Tener una fuente única de datos para trabajadores, tallas, inventario y movimientos.
- Permitir que los cambios se reflejen en tiempo real entre sesiones.
- Calcular necesidades de compra a partir de tallas registradas, dotación proyectada y stock.
- Exportar información para respaldos, licitaciones y proveedores.
- Mantener una operación simple, sin infraestructura de servidor propia.

### 2.3 Usuarios previstos

- Encargada de inventario y bodega.
- Personal administrativo de apoyo.
- Usuarios de consulta o registro, según los roles locales definidos en la aplicación.

---

## 3. Alcance y estado actual

### 3.1 Incluido en la versión actual

- Inicio de sesión local con roles.
- Inventario con stock, valorización y alertas.
- Registro y edición de trabajadores y tallas.
- Movimientos de ingreso, entrega y ajuste.
- Plan de compra con cálculo de demanda y presupuesto.
- Importación y exportación CSV.
- Sincronización con Firestore.
- Despliegue automatizado en Firebase Hosting.

### 3.2 Preparado pero no conectado en la navegación

Los siguientes componentes existen en el repositorio, pero no están montados en `src/App.tsx` o no tienen una ruta activa:

- `GoogleDriveView.tsx`: administración completa de archivos en Google Drive.
- `DashboardView.tsx`: panel ejecutivo alternativo.
- `DeliveriesView.tsx`: vista detallada de entregas.
- `WorkerSelfSurveyModal.tsx`: portal de autoregistro de tallas.
- `ShareQrModal.tsx`: generación de QR para el autoregistro.
- `AuthModal.tsx`: modal de autenticación alternativo; el login activo es `LoginPage.tsx`.
- `ProtectedViewGuard.tsx`: guardia de vistas protegidas.

Esto significa que algunas funciones descritas en el código no son accesibles desde la interfaz actual. En particular, la integración completa con Google Drive y el portal de autoregistro requieren trabajo adicional para quedar operativos.

### 3.3 Fuera de alcance por ahora

- Autenticación corporativa con Google Workspace o SSO.
- Backend desplegado para la IA de compras.
- Aplicación móvil nativa.
- Firma electrónica avanzada.
- Multiempresa con aislamiento de datos.
- Migración a un modelo de un documento por trabajador o movimiento.

---

## 4. Glosario

| Término | Significado |
|---|---|
| Dotación | Conjunto de prendas y EPP asignados a un trabajador. |
| EPP | Equipo de protección personal. |
| Matriz de tallas | Tabla de stock o demanda por prenda y talla. |
| Movimiento | Ingreso, entrega o ajuste de stock. |
| Buffer | Margen de seguridad de unidades adicionales sobre la demanda calculada. |
| Lead time | Tiempo de confección y despacho de un proveedor. |
| SPA | Single Page Application; aplicación de una sola página. |
| BaaS | Backend as a Service; servicios administrados como Firestore. |
| JSON | Formato de texto usado para guardar las colecciones en Firestore. |
| Documento | Unidad de almacenamiento de Firestore. En DataFit cada colección es un documento. |
| Reglas de Firestore | Reglas que autorizan o deniegan lectura y escritura en la base de datos. |

---

## 5. Arquitectura

### 5.1 Vista general

```text
┌─────────────────────────────────────────────────────────────┐
│                        Navegador                            │
│                                                             │
│  React 19 + Vite + Tailwind                                  │
│  ├── AuthContext (login local en localStorage)               │
│  ├── UniformsContext (estado de negocio)                     │
│  │   ├── useFirestoreAppState                                │
│  │   │   └── AppStateStore                                   │
│  │   │       └── firestoreRepository                         │
│  │   └── Google Drive (opcional)                             │
│  └── Componentes de interfaz                                 │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
                │ Firestore Web SDK            │ Google Drive API
                ▼                              ▼
┌─────────────────────────────┐      ┌──────────────────────────┐
│ Firebase proyecto datafitjac│      │ Firebase Auth / Drive    │
│ Firestore (default)         │      │ proyecto pure-run-9mn89  │
│ appState/{employees,...}    │      │ OAuth + Google Drive     │
└─────────────────────────────┘      └──────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Servidor local Express (server.ts)                          │
│ ├── Sirve Vite en desarrollo                                │
│ ├── /api/health                                             │
│ └── /api/ai/procurement-analysis (Gemini o heurística)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Firebase Hosting (producción)                               │
│ Publica dist/ y reescribe rutas SPA a index.html            │
│ No ejecuta server.ts ni las rutas /api                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Frontend

- Punto de entrada: `src/main.tsx`.
- Composición principal: `src/App.tsx`.
- Estado global de autenticación: `src/context/AuthContext.tsx`.
- Estado global de inventario y dotación: `src/context/UniformsContext.tsx`.
- Componentes de interfaz: `src/components/`.
- Tipos del dominio: `src/types.ts`.
- Estilos: `src/index.css` con Tailwind CSS 4.

### 5.3 Servidor Express

`server.ts` cumple dos funciones:

1. En desarrollo, monta Vite como middleware y sirve la SPA en el puerto 3000.
2. Expone la API opcional de análisis de compras:
   - `GET /api/health`
   - `POST /api/ai/procurement-analysis`

La API usa `GEMINI_API_KEY` si existe. Si no existe, devuelve un análisis heurístico generado localmente, sin llamar a Gemini.

En producción, Firebase Hosting solo publica archivos estáticos. El servidor Express y las rutas `/api` no se despliegan; por eso la función de IA no está disponible en `datafitjac.web.app`.

### 5.4 Firebase

- **Firestore:** base de datos compartida del proyecto `datafitjac`, base `(default)`, colección `appState`.
- **Hosting:** publicación del frontend compilado en `dist/`.
- **Authentication:** proyecto separado `pure-run-9mn89`, usado para el inicio de sesión con Google y el acceso a Drive.
- **Firebase Web Config:** la configuración web es pública y está incluida en el frontend; no es un secreto. El control real del acceso depende de las reglas de Firestore.

### 5.5 Repositorio y CI/CD

- Repositorio: `https://github.com/Naisach/DataFit`.
- Rama de producción: `main`.
- Workflow de producción: `.github/workflows/firebase-hosting-merge.yml`.
- Workflow de preview: `.github/workflows/firebase-hosting-pull-request.yml`.
- Secreto requerido: `FIREBASE_SERVICE_ACCOUNT_DATAFITJAC`.

---

## 6. Funcionalidades

### 6.1 Inicio de sesión y roles

El login es local y se administra en `src/context/AuthContext.tsx`.

- Los usuarios se guardan en `localStorage` bajo `bodega_registered_users_v1`.
- La sesión activa se guarda en `bodega_active_session_v2`.
- Las contraseñas se almacenan en texto plano en el campo `passwordHash`. El nombre del campo es engañoso: no hay hash ni cifrado.
- El registro crea cuentas con rol `operador`.
- Las cuentas iniciales son:
  - `admin` / `admin123`, rol `admin`.
  - `bodega` / `bodega2026`, rol `encargado`.

Esta autenticación no protege Firestore ni constituye un mecanismo de seguridad de producción. Cualquier persona que conozca la configuración pública del proyecto y las reglas actuales puede acceder a la base de datos directamente.

### 6.2 Inventario

Archivo principal: `src/components/InventoryView.tsx`.

Permite:

- Ver stock total y valorización.
- Ver alertas de stock mínimo.
- Filtrar por empresa.
- Alternar entre vista de tabla por temporada y vista detallada por ítem.
- Registrar ingresos de stock.
- Registrar entregas a trabajadores.
- Ajustar stock manualmente con motivo y responsable.
- Editar nombre, stock mínimo, costo unitario y ubicación de un ítem.
- Importar matrices de inventario desde CSV.
- Exportar información.

Los ingresos y entregas actualizan el inventario y agregan un registro en `movements`. Los ajustes generan un movimiento de tipo `ajuste`.

### 6.3 Trabajadores

Archivo principal: `src/components/EmployeesView.tsx`.

Permite:

- Buscar por identificador, nombre, empresa, cargo, RUT o marca temporal.
- Filtrar por empresa, género y estado de tallas.
- Paginar de a 50 registros para rendir con cientos de trabajadores.
- Crear, editar y eliminar fichas.
- Registrar tallas de blusa, camisa, sweater, polar, parka, pantalón, calzado, chaqueta y protección de cabeza.
- Registrar estado de encuesta y estado de entrega.
- Exportar la nómina a CSV.
- Exportar a Google Drive, sujeto a la disponibilidad de una sesión de Drive.
- Abrir el modal de entrega para un trabajador.

### 6.4 Movimientos

Archivo principal: `src/components/MovementsView.tsx`.

Permite:

- Registrar ingresos de stock.
- Registrar entregas.
- Consultar el historial de movimientos.
- Exportar el libro de movimientos a CSV.

Cada movimiento incluye tipo, fecha, prenda, categoría, talla, cantidad, documento de referencia, proveedor o trabajador, responsable, notas y empresa cuando corresponde.

### 6.5 Plan de compra

Archivo principal: `src/components/ProcurementPlanView.tsx`.

El cálculo se realiza en `src/context/UniformsContext.tsx` con la función `calculatePurchasePlan`. La lógica es:

1. Se calculan las cantidades confirmadas por prenda y talla según los trabajadores registrados.
2. Para prendas de temporada, se proyectan trabajadores adicionales:
   - `max(0, trabajadoresProyectados - trabajadoresEstivalesRegistrados)`.
3. Se distribuyen las proyecciones según la proporción de tallas registradas.
4. Se aplica la cantidad por persona:
   - 2 unidades para prendas superiores.
   - 2 unidades para prendas inferiores.
   - 1 unidad para calzado, abrigo y protección.
5. Se calcula el buffer:
   - `buffer = ceil((confirmado + proyectado) * bufferPercent / 100)`.
6. Se calcula el total bruto:
   - `bruto = confirmado + proyectado + buffer`.
7. Se descuenta el stock disponible por prenda y talla.
8. Se calcula el costo neto y el costo bruto.

La vista muestra presupuesto, unidades, cronograma, semáforo de adquisición, tabla por talla, exportación CSV y ficha de licitación imprimible. El catálogo de prendas (`garments`) está definido en código en `INITIAL_GARMENTS`; no se administra desde Firestore.

### 6.6 Carga masiva CSV

Archivos:

- `src/components/BulkImportModal.tsx`
- `src/services/csvParserService.ts`

Características:

- Detecta delimitador `;`, `,` o tabulación.
- Detecta si el contenido corresponde a trabajadores o a una matriz de inventario.
- Permite reemplazar o agregar registros.
- Permite seleccionar la temporada de destino.
- Procesa encabezados y filas vacías.
- Convierte cantidades de inventario a números.

La importación no aplica un esquema estricto de validación. Los valores inesperados pueden terminar guardados como cadenas vacías, `0`, `NaN` o `null` según el flujo.

### 6.7 Google Drive

Archivos:

- `src/services/authService.ts`
- `src/services/googleDriveService.ts`
- `src/components/GoogleDriveView.tsx`

La integración permite:

- Iniciar sesión con Google mediante Firebase Auth.
- Crear o buscar la carpeta `DataFit Uniformes & EPP`.
- Listar archivos.
- Exportar nómina de trabajadores.
- Exportar plan de adquisiciones.
- Exportar actas de entrega.
- Exportar un respaldo integral en JSON.
- Descargar, restaurar y eliminar archivos.
- Subir archivos personalizados.

Limitaciones actuales:

- `GoogleDriveView` no está montado en `App.tsx`.
- Los botones de exportación a Drive dependen de un token en memoria que hoy no se puede obtener desde la interfaz activa.
- El token se guarda solo en memoria, no en `localStorage`.
- Se solicitan permisos amplios de Drive, más de los estrictamente necesarios para la carpeta de la aplicación.

### 6.8 Autoregistro y QR

Archivos:

- `src/components/WorkerSelfSurveyModal.tsx`
- `src/components/ShareQrModal.tsx`

El código incluye un formulario móvil para que un trabajador registre sus tallas y un generador de QR. Sin embargo:

- El componente de autoregistro no está renderizado en `App.tsx`.
- La ruta `?view=self_service` no muestra el portal en la versión actual.
- `ShareQrModal` apunta a `https://datafit.ai.studio` y a una URL antigua de Cloud Run, no a `https://datafitjac.web.app/`.

Por lo tanto, esta funcionalidad debe considerarse incompleta.

### 6.9 Análisis de compras con IA

Archivo: `server.ts`.

- Endpoint: `POST /api/ai/procurement-analysis`.
- Modelo configurado: `gemini-3.8-flash`.
- Si `GEMINI_API_KEY` no está definida, responde con un análisis heurístico.
- Si Gemini falla, devuelve error 500.
- En Firebase Hosting no existe el endpoint; la llamada del frontend falla y se captura silenciosamente.

---

## 7. Modelo de datos

### 7.1 Documentos de Firestore

La colección `appState` contiene seis documentos. Cada documento tiene un campo `json` de tipo string con el arreglo u objeto serializado, y un campo `updatedAt` con la marca de tiempo del servidor.

| Documento | Contenido | Tipo lógico |
|---|---|---|
| `appState/employees` | Trabajadores y tallas | `Employee[]` |
| `appState/inventory` | Ítems de inventario | `InventoryItem[]` |
| `appState/matrix` | Matriz de tallas por temporada | `MatrixRow[]` |
| `appState/movements` | Ingresos, entregas y ajustes | `StockMovement[]` |
| `appState/deliveries` | Entregas y actas | `UniformDelivery[]` |
| `appState/config` | Configuración de planificación | `SeasonPlanningConfig` |

Ejemplo conceptual:

```json
{
  "json": "[{\"id\":\"emp-1\",\"fullName\":\"...\"}]",
  "updatedAt": "Timestamp"
}
```

### 7.2 Entidades principales

#### Employee

Representa a un trabajador. Campos relevantes:

- `id`, `identifier`, `company`, `rut`, `fullName`.
- `email`, `phone`, `type`, `department`, `workLocation`, `role`.
- `genderFit`, `gender`.
- `sizes`: tallas de blusa, camisa, sweater, polar, parka, pantalón, calzado, chaqueta y protección de cabeza.
- `surveyStatus`, `contractStart`, `contractEnd`.
- `lastDeliveryDate`, `deliveryStatus`.
- `createdAt`, `updatedAt`, `notes`, `timestamp`.

#### InventoryItem

Representa stock de una prenda en una talla específica:

- `id`, `code`, `name`, `category`, `size`.
- `currentStock`, `minStock`, `unitCostCLP`.
- `location`, `lastUpdated`.
- `company`, `storageType`, `season`.

#### MatrixRow

Representa una fila de la matriz de inventario:

- `id`, `season`, `company`, `storageType`, `garmentName`.
- `sizes`: mapa de talla a cantidad.
- `total`.

#### StockMovement

Representa un movimiento de bodega:

- `id`, `code`, `type` (`ingreso`, `entrega`, `ajuste`).
- `date`, `itemId`, `garmentName`, `category`, `size`, `quantity`.
- `documentRef`, `party`, `responsible`, `notes`, `signature`, `company`.

#### UniformDelivery

Representa una entrega y su acta:

- `id`, `deliveryCode`, `employeeId`, `employeeName`, `employeeRut`.
- `employeeType`, `department`, `workLocation`, `kitName`.
- `items`: prendas, tallas, cantidades y estado.
- `status`, `deliveryDate`, `dispatcherName`.
- `receiverSignature`, `signedAt`, `comments`.

#### SeasonPlanningConfig

Configuración del plan de compra:

- `seasonName`, `targetDeliveryDate`, `supplierCutoffDate`.
- `projectedSummerWorkers`, `currentSeasonalWorkers`, `permanentWorkersCount`.
- `bufferPercent`.

En la interfaz, `permanentWorkersCount` y `currentSeasonalWorkers` se recalculan a partir de los trabajadores registrados. El valor guardado se combina con esos conteos.

### 7.3 Datos que no están en Firestore

- El catálogo de prendas `INITIAL_GARMENTS` está en `src/data/mockData.ts`.
- Los datos de ejemplo (`INITIAL_*`) y los datos oficiales (`OFFICIAL_*`) están en `src/data/`.
- Los usuarios y la sesión están en `localStorage`.
- Los archivos exportados a Drive no se guardan en Firestore.

### 7.4 Datos iniciales

La aplicación no siembra datos automáticamente. Si un documento no existe:

- Las colecciones se muestran vacías.
- La configuración usa los valores por defecto.
- No se crean documentos hasta que el usuario realiza una acción explícita.

Los botones de restablecer datos de ejemplo u oficiales sí escriben en Firestore. `resetToSampleData` y `resetToOfficialData` muestran una confirmación, pero reemplazan datos compartidos.

---

## 8. Persistencia y sincronización

### 8.1 Flujo

```text
UniformsContext
  └── useFirestoreAppState(defaults)
        └── AppStateStore
              ├── repository.listen(...)
              └── repository.commit(...)
                    └── firestoreRepository
                          ├── onSnapshot
                          └── runTransaction
```

### 8.2 `useFirestoreAppState`

`src/hooks/useFirestoreAppState.ts` crea una instancia de `AppStateStore`, la inicia al montar el componente y la detiene al desmontarlo. También bloquea el cierre de la pestaña si hay cambios pendientes de guardar.

### 8.3 `AppStateStore`

`src/services/appStateStore.ts` implementa la lógica de estado:

- Mantiene los valores en memoria, los valores por defecto y una línea base (`baseline`) del JSON remoto.
- Solo marca como `dirty` los documentos modificados por una acción explícita.
- Recibir una instantánea de Firestore no genera escrituras.
- Aplica un retraso de 250 ms antes de guardar para agrupar cambios.
- Guarda todos los documentos modificados en una sola transacción.
- Compara el JSON canónico actual con la línea base para detectar conflictos entre sesiones.
- Si otra sesión modificó un documento, cancela el guardado y muestra un error.
- Si hay cambios pendientes, muestra un aviso y permite descargarlos antes de recargar.
- Si no se puede conectar en 15 segundos, muestra un error y bloquea la edición.

### 8.4 `firestoreRepository`

`src/services/firestoreState.ts`:

- Inicializa una app Firebase nombrada `datafit-storage`.
- Escucha la colección `appState` con `onSnapshot`.
- Ignora instantáneas provenientes de caché o con escrituras pendientes.
- Valida que cada documento tenga el campo `json` como string.
- Guarda mediante `runTransaction`, leyendo primero todos los documentos y escribiendo después.
- Actualiza `updatedAt` con `serverTimestamp()`.

### 8.5 Concurrencia

El control de concurrencia es optimista:

1. El cliente conserva el JSON canónico que leyó.
2. Antes de escribir, la transacción vuelve a leer el documento.
3. Si el JSON actual no coincide con la línea base, se aborta el guardado.
4. El usuario debe descargar sus cambios pendientes y recargar.

Esto evita sobrescribir cambios de otra sesión, pero no implementa fusión automática de datos.

### 8.6 Límite de 1 MiB

Firestore limita cada documento a 1 MiB. Como cada colección completa se guarda en un solo documento, el crecimiento de trabajadores, movimientos o entregas puede acercarse al límite. Las firmas en Base64 y los textos extensos aceleran ese crecimiento.

Este es el principal riesgo técnico de la arquitectura actual, más probable que agotar las cuotas de Spark.

---

## 9. Autenticación, roles y seguridad

### 9.1 Autenticación local

- Implementada en `src/context/AuthContext.tsx`.
- No usa Firebase Authentication.
- Los usuarios viven en `localStorage`.
- La sesión se restaura al recargar.
- Las contraseñas están en texto plano.
- El registro está disponible desde `LoginPage`.
- Los roles son `admin`, `encargado` y `operador`.

### 9.2 Firebase Authentication y Drive

- Implementado en `src/services/authService.ts`.
- Usa el proyecto `pure-run-9mn89` mediante `firebase-applet-config.json`.
- Inicia sesión con Google mediante popup.
- Solicita permisos amplios de Google Drive.
- Guarda el token de acceso solo en memoria.
- El componente que contiene el flujo de inicio de sesión (`GoogleDriveView`) no está montado actualmente.

### 9.3 Seguridad de Firestore

Según `LEEME-FIRESTORE.md`, las reglas actuales permiten leer y escribir `appState` a cualquier visitante. Esto implica:

- Cualquier persona con la configuración pública del proyecto puede leer datos.
- Cualquier persona puede modificar o borrar datos.
- Los datos personales de trabajadores (RUT, nombre, teléfono, correo, tallas) quedan expuestos.
- Las cuotas pueden ser consumidas por terceros.

Antes de usar la aplicación con datos reales de la empresa, es obligatorio restringir las reglas y definir un modelo de autorización.

### 9.4 Claves y secretos

- La `apiKey` web de Firebase es pública; no debe tratarse como un secreto.
- La cuenta de servicio de Firebase solo se usa para desplegar desde GitHub Actions.
- El secreto `FIREBASE_SERVICE_ACCOUNT_DATAFITJAC` debe rotarse al transferir el proyecto.
- `GEMINI_API_KEY` es una clave de servidor y no debe exponerse en el frontend ni en variables `VITE_*`.
- `.env*` está ignorado por git, excepto `.env.example`.

### 9.5 Recomendaciones de seguridad

- Restringir las reglas de Firestore por usuario autenticado y por operación.
- Reemplazar el login local por Firebase Authentication o un proveedor corporativo.
- No almacenar contraseñas en texto plano.
- Aplicar App Check para reducir abuso desde clientes no autorizados.
- Limitar los permisos de Google Drive a lo necesario.
- Rotar la cuenta de servicio y eliminar claves antiguas.
- Configurar alertas de presupuesto si se pasa a Blaze.

---

## 10. Firebase: decisión técnica y plan Spark

### 10.1 Por qué se usa Firebase

Firebase se eligió por las siguientes razones:

1. **Sincronización en tiempo real:** Firestore permite que varios dispositivos vean los cambios sin implementar WebSockets ni un backend propio.
2. **Menos infraestructura:** no hay que administrar servidores, bases de datos ni despliegues de backend para el flujo principal.
3. **Hosting integrado:** Firebase Hosting publica la SPA en una CDN con HTTPS y dominio propio.
4. **Integración con Google:** facilita el inicio de sesión con Google y el acceso a Drive para exportaciones.
5. **Despliegue automatizado:** GitHub Actions publica en Firebase Hosting al hacer merge a `main`.
6. **Costo inicial cero:** el plan Spark cubre el volumen previsto sin tarjeta de crédito.
7. **Iteración rápida:** el equipo puede concentrarse en la interfaz y las reglas de negocio.

### 10.2 Por qué no un backend tradicional

Un backend Express con base de datos relacional habría requerido:

- Servidor y despliegue.
- Autenticación propia.
- Endpoints para cada operación.
- Copias de seguridad y monitoreo.
- Mayor costo operativo.

Para una aplicación interna, de bajo volumen y con una sola fuente de datos compartida, Firestore + Hosting reduce la complejidad. La contrapartida es el acoplamiento a Firebase y el modelo de un documento JSON por colección.

### 10.3 Servicios de Firebase utilizados

| Servicio | Uso en DataFit |
|---|---|
| Firestore | Persistencia de las seis colecciones de `appState`. |
| Hosting | Publicación del frontend compilado. |
| Authentication | Inicio de sesión con Google para Drive, en un proyecto separado. |
| Google Drive API | Exportación y respaldo de archivos, mediante OAuth. |
| GitHub Actions + Firebase | Despliegue automatizado. |

No se usan Cloud Functions, Firebase Storage ni Realtime Database en el flujo actual.

### 10.4 Límites del plan Spark

Los límites gratuitos relevantes son:

| Recurso | Límite Spark |
|---|---|
| Hosting: almacenamiento | 10 GB |
| Hosting: transferencia | 360 MB/día |
| Hosting: dominio propio y SSL | Incluido |
| Hosting: múltiples sitios por proyecto | Incluido, con cuota compartida |
| Firestore: almacenamiento | 1 GiB |
| Firestore: lecturas de documentos | 50.000/día |
| Firestore: escrituras de documentos | 20.000/día |
| Firestore: eliminaciones | 20.000/día |
| Firestore: egreso de red | 10 GiB/mes |
| Cloud Functions | No disponible en Spark |
| Authentication | Capa gratuita para MAU, no usada para el login principal |

Las cuotas se aplican por proyecto y se reinician diariamente. En Spark no hay cobros: si se supera un límite, el servicio puede quedar restringido hasta el siguiente ciclo.

### 10.5 Estimación de uso para la empresa

Supuestos:

- 1 a 5 usuarios habituales.
- Uso esporádico, concentrado en fechas de gestión.
- Apertura de la aplicación decenas de veces al día como máximo.
- Sin archivos pesados dentro de Firestore.
- Sin videos alojados en Firebase.

Consumo estimado:

| Actividad | Consumo aproximado |
|---|---|
| Abrir la aplicación | 6 lecturas de Firestore + 1–3 MB de Hosting |
| Registrar un ingreso | 2 escrituras (inventario y movimientos) |
| Registrar una entrega | 2–3 escrituras |
| Importar 500 trabajadores | 1 escritura del documento de empleados |
| Consultar durante una jornada | decenas a cientos de lecturas |
| 50 aperturas diarias de 2 MB | ~100 MB/día de Hosting |
| 500 operaciones diarias | muy por debajo de 20.000 escrituras |

Incluso con 1.000 aperturas diarias de 2 MB, se llegarían a ~2 GB/día de Hosting, muy por encima de los 360 MB/día. Sin embargo, ese escenario no corresponde al uso interno previsto. El límite de Hosting sería el primero en notarse si la aplicación se abriera masivamente, no las cuotas de Firestore.

### 10.6 Por qué Spark es suficiente

Para el uso descrito, Spark es suficiente porque:

- El número de usuarios y operaciones es bajo.
- No se almacenan videos ni archivos binarios en Firebase.
- El frontend es pequeño y los navegadores cachean recursos.
- Las seis colecciones de Firestore pesan poco en comparación con 1 GiB.
- No se usan Cloud Functions ni servicios que requieran Blaze.
- El despliegue y el dominio propio funcionan en Spark.

El riesgo principal no es la cuota, sino:

- El límite de 1 MiB por documento.
- La seguridad abierta de Firestore.
- La falta de validación de tipos.
- La falta de respaldos administrados.

### 10.7 Cuándo pasar a Blaze

Conviene evaluar el plan Blaze si ocurre alguno de estos casos:

- Se superan las 20.000 escrituras o 50.000 lecturas diarias.
- Se superan los 360 MB/día de Hosting.
- Se necesita un backend para IA o integraciones.
- Se necesitan respaldos administrados, recuperación a un punto en el tiempo o mayor retención.
- Se requiere evitar que el servicio se detenga por límites duros.
- Se necesita autenticación con más funciones o integración con Identity Platform.
- La empresa exige facturación y gobierno bajo su propia cuenta.

Blaze incluye las mismas cuotas gratuitas de Spark. Si el uso se mantiene bajo, el costo puede seguir siendo cercano a cero, pero se requiere una cuenta de facturación. Se recomienda configurar alertas de presupuesto y revisar el consumo mensualmente.

---

## 11. Desarrollo local

### 11.1 Requisitos

- Node.js 22 o superior. El CI usa Node.js 24.
- npm.
- Git.
- Opcional: Java 17 y Firebase CLI para el emulador de Firestore.
- Opcional: Docker, si se quiere aislar el entorno.

### 11.2 Instalación

```bash
git clone https://github.com/Naisach/DataFit
cd DataFit
npm ci
```

El repositorio incluye `package-lock.json` y `bun.lock`. El CI usa `npm ci`; no se requiere Bun.

### 11.3 Variables de entorno

Crear `.env` a partir de `.env.example`:

```env
GEMINI_API_KEY="..."
APP_URL="http://localhost:3000"
```

- `GEMINI_API_KEY` es opcional. Sin ella, la API de compras usa el modo heurístico.
- `APP_URL` no es crítica para el flujo actual.
- No se necesitan credenciales de servicio para ejecutar la aplicación en local.
- No se deben incluir secretos en variables `VITE_*`, porque quedan expuestas en el bundle.

### 11.4 Ejecución

```bash
npm run dev
```

Abrir http://localhost:3000. Express monta Vite en modo middleware y sirve la SPA.

Para acceder:

- `admin` / `admin123`.
- `bodega` / `bodega2026`.
- O registrar una cuenta local desde la pantalla de login.

### 11.5 Pruebas y validaciones

```bash
npm run lint
npm run test:state
```

`npm run lint` ejecuta TypeScript sin emitir archivos. `npm run test:state` ejecuta siete pruebas con `node:test`.

### 11.6 Compilación de producción local

```bash
npm run build
NODE_ENV=production npm start
```

Esto sirve `dist/` y las rutas `/api` desde el servidor Express. `npm run preview` solo sirve el frontend estático y no incluye `/api`.

### 11.7 Emulador de Firestore

Actualmente el proyecto no está configurado para usar el emulador. Para probar guardados sin afectar la base compartida se recomienda:

1. Instalar Firebase CLI:

   ```bash
   npx firebase-tools --version
   ```

2. Iniciar el emulador con un proyecto local:

   ```bash
   npx firebase-tools emulators:start --only firestore --project demo-datafit
   ```

   Si el CLI indica que falta configuración de Firestore, agrega el bloque `firestore` correspondiente en `firebase.json` y un archivo de reglas para desarrollo. No uses las reglas de producción para el emulador sin revisarlas.

3. Agregar una conexión condicional en `src/services/firestoreState.ts`:

   ```ts
   import { connectFirestoreEmulator } from 'firebase/firestore';

   if (import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
     connectFirestoreEmulator(db, '127.0.0.1', 8080);
   }
   ```

4. Crear `.env.local`:

   ```env
   VITE_USE_FIRESTORE_EMULATOR=true
   ```

5. Ejecutar `npm run dev` y revisar los datos en http://localhost:4000.

Ventajas:

- Los datos son locales y descartables.
- No se requieren credenciales de Firebase.
- No se modifican datos de producción.
- Se pueden probar guardados, conflictos y validaciones.

Precauciones:

- `.env.local` no debe subirse al repositorio.
- El flag debe estar protegido por `import.meta.env.DEV` para que nunca se active en el build de producción.
- Si se usa export/import del emulador, agregar el directorio de datos al `.gitignore`.

### 11.8 Docker

No hay Dockerfile ni `docker-compose.yml` en el repositorio. Se puede agregar un entorno con Node 24 para replicar el CI, por ejemplo:

- Imagen base `node:24-alpine`.
- Montaje del código.
- `npm ci`.
- `npm run dev`.
- Puerto 3000.

Docker no aísla Firestore; para eso se necesita el emulador o un proyecto de desarrollo separado.

### 11.9 Advertencia sobre datos de producción

Por defecto, la aplicación apunta a `datafitjac`. Ejecutar `npm run dev` y guardar cambios afecta la base compartida. Para pruebas de interfaz sin guardar, basta con navegar; para probar guardados, usar el emulador.

---

## 12. Despliegue

### 12.1 Build

`npm run build` ejecuta:

1. `vite build`, que genera el frontend en `dist/`.
2. `esbuild server.ts`, que genera `dist/server.cjs`.

Firebase Hosting publica `dist/` y reescribe todas las rutas a `index.html`. El archivo `server.cjs` no se publica porque está incluido en `ignore` de `firebase.json`.

### 12.2 Flujo de producción

Archivo: `.github/workflows/firebase-hosting-merge.yml`.

Se dispara con push a `main`:

1. Checkout del repositorio.
2. Node.js 24.
3. `npm ci && npm run test:state && npm run build`.
4. Deploy a Firebase Hosting con la cuenta de servicio.

### 12.3 Preview de Pull Requests

Archivo: `.github/workflows/firebase-hosting-pull-request.yml`.

Se dispara con pull requests y publica un canal de preview. La preview usa el mismo bundle y por lo tanto el mismo Firestore de producción. Sirve para revisar interfaz y compilación, pero no para probar guardados de forma segura.

### 12.4 Proyecto y secreto

- Proyecto: `datafitjac`.
- Secreto: `FIREBASE_SERVICE_ACCOUNT_DATAFITJAC`.
- Proyecto de Firebase Authentication/Drive: `pure-run-9mn89`.

### 12.5 Rollback

Opciones:

- Revertir el commit en `main` y dejar que el workflow vuelva a desplegar.
- Usar el historial de versiones de Firebase Hosting para volver a una versión anterior.
- Mantener respaldos JSON de Firestore antes de cambios importantes.

### 12.6 Limitación del despliegue estático

Firebase Hosting no ejecuta `server.ts`. Por lo tanto:

- `/api/health` y `/api/ai/procurement-analysis` no existen en producción.
- La IA de compras no funciona en el sitio publicado.
- Cualquier funcionalidad futura que requiera backend necesitará Cloud Functions, App Hosting o un servidor externo.

---

## 13. Operación y mantenimiento

### 13.1 Monitoreo

Revisar periódicamente en Firebase Console:

- Uso de Firestore: lecturas, escrituras, almacenamiento y egreso.
- Uso de Hosting: almacenamiento y transferencia.
- Errores y latencia.
- Estado del despliegue en GitHub Actions.

### 13.2 Respaldos

- La aplicación permite descargar un JSON con cambios pendientes.
- El módulo de Drive, cuando esté conectado, permite exportar respaldos integrales.
- Para respaldos administrados de Firestore se requiere evaluar Blaze.
- Antes de importar o restablecer datos, descargar un respaldo.

### 13.3 Tamaño de los documentos

Revisar el tamaño de los documentos de `appState`, especialmente:

- `employees` si crece el número de trabajadores.
- `movements` si se acumulan años de operación.
- `deliveries` si incluyen firmas o imágenes en Base64.

Si un documento se acerca a 1 MiB, migrar a un modelo de un documento por entidad.

### 13.4 Usuarios y accesos

- Revisar periódicamente los Owners del proyecto Firebase.
- Mantener al menos dos Owners de la empresa.
- Rotar la cuenta de servicio de GitHub Actions.
- Revisar miembros del repositorio de GitHub.
- Revisar qué cuentas pueden desplegar.

### 13.5 Datos personales

La base contiene RUT, nombres, teléfonos, correos y tallas. Antes de producción:

- Restringir el acceso.
- Definir quién puede leer y escribir.
- Evitar exportaciones innecesarias.
- Documentar la retención y eliminación de datos.

---

## 14. Limitaciones y deuda técnica

### 14.1 Seguridad

- Autenticación local sin hash de contraseñas.
- Reglas de Firestore abiertas.
- Sin App Check ni rate limiting.
- Permisos de Google Drive amplios.
- Configuración web pública (esperable, pero requiere reglas adecuadas).

### 14.2 Persistencia

- Un documento por colección, con límite de 1 MiB.
- Sin validación de esquema en Firestore.
- Sin migraciones.
- Sin respaldos administrados en Spark.
- Sin fusión automática de cambios concurrentes.

### 14.3 Validación

- TypeScript valida solo en compilación.
- Los formularios convierten números con `Number()` o `parseInt()` sin comprobar `NaN`.
- Un campo vacío puede convertirse en `0`.
- Los campos de RUT, teléfono y correo no tienen validación estricta.
- La importación CSV no valida todos los tipos.

### 14.4 Interfaz y módulos

- Varias vistas no están conectadas a la navegación.
- El portal de autoregistro no está disponible.
- El QR apunta a URLs antiguas.
- El módulo de Google Drive no se puede iniciar desde la UI actual.
- Algunos códigos de movimiento usan el año 2026 y contadores basados en la longitud del arreglo.
- Algunas fechas de planificación están fijas en el código.

### 14.5 Pruebas

- Solo existen pruebas de la capa de estado.
- No hay pruebas de componentes, formularios, validación ni flujos completos.
- No hay pruebas de reglas de Firestore.

### 14.6 Operación

- No hay monitoreo de errores de frontend.
- No hay alertas de cuota.
- No hay proceso documentado de restauración ante desastres.
- La IA no está disponible en producción.

---

## 15. Traspaso a la empresa

El proyecto puede transferirse sin rehacer el desarrollo. Hay dos caminos.

### 15.1 Transferir el proyecto actual

Recomendado para conservar la URL `https://datafitjac.web.app/`, los datos y el historial.

1. Agregar una cuenta Google de la empresa como **Owner** en Firebase Console y en Google Cloud IAM.
2. Si la empresa tiene Google Workspace/Cloud Organization, migrar el proyecto a su organización.
3. Revisar la facturación. Actualmente Spark; si se pasa a Blaze, asociar la cuenta de facturación de la empresa.
4. Transferir el repositorio de GitHub a la organización o cuenta de la empresa.
5. Crear una nueva clave de cuenta de servicio y actualizar el secreto `FIREBASE_SERVICE_ACCOUNT_DATAFITJAC` en el repositorio de la empresa.
6. Eliminar la clave anterior.
7. Transferir o recrear el proyecto `pure-run-9mn89` usado para Google Drive/Auth.
8. Revisar OAuth consent screen, dominios autorizados y client ID.
9. Transferir el dominio y DNS si se usa un dominio propio.
10. Verificar que el despliegue funcione con las cuentas de la empresa.
11. Quitar las cuentas personales como Owners, dejando al menos dos Owners de la empresa.

### 15.2 Crear un proyecto nuevo

Recomendado si la empresa exige un proyecto limpio bajo su propia organización.

Implica:

- Crear el proyecto Firebase.
- Habilitar Firestore y Hosting.
- Copiar los seis documentos de `appState`.
- Actualizar `src/services/firestoreState.ts`, `firebase-applet-config.json`, `.firebaserc` y los workflows.
- Crear una nueva cuenta de servicio y secreto.
- Cambiar la URL de despliegue.
- Revisar OAuth y dominios autorizados.

### 15.3 Lo que no es necesario

- No es necesario que la empresa instale Firebase CLI para desplegar; GitHub Actions lo hace.
- No es necesario volver a desarrollar la aplicación.
- No es necesario migrar usuarios de Firebase Auth para el login principal, porque el login es local.
- No es necesario recrear los datos si se transfiere el proyecto actual.

### 15.4 Antes de entregar

- Restringir reglas de Firestore.
- Rotar claves.
- Revisar Owners y miembros de GitHub.
- Documentar el proceso de despliegue.
- Configurar alertas de uso.
- Acordar quién administra Firebase, GitHub y Google Cloud.
- Definir política de respaldos.

---

## 16. Roadmap recomendado

### Corto plazo

- Implementar validación de formularios y tipos en tiempo de ejecución.
- Corregir la conversión de números vacíos a `0` o `null`.
- Agregar validación de RUT, teléfono y correo.
- Configurar el emulador de Firestore para desarrollo.
- Restringir las reglas de Firestore.
- Revisar y corregir las rutas del QR y del autoregistro.
- Conectar o eliminar las vistas no utilizadas.

### Mediano plazo

- Reemplazar la autenticación local por Firebase Authentication o SSO corporativo.
- Migrar de un documento por colección a un documento por entidad, o al menos separar movimientos y entregas.
- Añadir pruebas de componentes y flujos completos.
- Implementar respaldos automáticos.
- Añadir App Check.
- Configurar monitoreo de errores y alertas de presupuesto.
- Revisar los permisos de Google Drive.

### Largo plazo

- Evaluar Blaze si crece el uso o se requiere backend.
- Implementar un backend para la IA si se necesita en producción.
- Añadir multiempresa y aislamiento de datos si corresponde.
- Definir un proceso formal de recuperación ante desastres.
- Completar el traspaso administrativo a la empresa.

---

## 17. Referencias

### Archivos clave

- `src/App.tsx`: composición principal.
- `src/context/AuthContext.tsx`: autenticación local.
- `src/context/UniformsContext.tsx`: estado de negocio y acciones.
- `src/hooks/useFirestoreAppState.ts`: integración del estado con Firestore.
- `src/services/appStateStore.ts`: lógica de estado, guardado y conflictos.
- `src/services/firestoreState.ts`: configuración de Firestore y transacciones.
- `src/services/authService.ts`: Firebase Auth y Google Drive.
- `src/services/googleDriveService.ts`: operaciones de Drive.
- `src/services/csvParserService.ts`: importación CSV.
- `server.ts`: servidor Express y API de IA.
- `firebase.json`, `.firebaserc`: configuración de Firebase.
- `.github/workflows/`: despliegue y preview.
- `LEEME-FIRESTORE.md`: notas originales sobre Firestore.

### Documentación externa

- Firebase Pricing: https://firebase.google.com/pricing
- Firestore: https://firebase.google.com/docs/firestore
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firebase Authentication: https://firebase.google.com/docs/auth
- Google Drive API: https://developers.google.com/drive
- Vite: https://vite.dev/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/

---

## Apéndice A. Preguntas frecuentes

### ¿La aplicación funciona sin conexión a internet?

No. Firestore y Google Drive requieren conexión. Firestore puede usar caché local, pero la aplicación está diseñada para sincronizar con la nube.

### ¿Dónde se guardan los datos?

En Firestore, proyecto `datafitjac`, colección `appState`. Los usuarios y la sesión se guardan en `localStorage`.

### ¿Se pueden perder datos?

Sí, si se borran documentos o se restablecen datos sin respaldo. Si se supera el límite de 1 MiB, los nuevos cambios no se podrán guardar hasta reducir el documento. La aplicación incluye descarga de cambios pendientes y exportaciones, pero no reemplazan una política formal de respaldos.

### ¿Se puede usar con varios usuarios a la vez?

Sí. Firestore sincroniza cambios en tiempo real y la transacción evita sobrescribir cambios concurrentes. Si hay conflicto, el guardado se detiene.

### ¿Por qué no se ven las funciones de Google Drive?

Porque `GoogleDriveView` no está montado en la aplicación actual y los botones de exportación requieren una sesión de Drive que no se puede iniciar desde la interfaz activa.

### ¿Por qué el QR no lleva a la página de producción?

Porque `ShareQrModal` usa URLs antiguas de AI Studio y Cloud Run. Debe actualizarse a `https://datafitjac.web.app/` cuando se conecte el módulo.

### ¿El plan Spark aguanta el uso de la empresa?

Sí, para el volumen previsto. El límite de Hosting (360 MB/día) y el de escrituras (20.000/día) están muy por encima del uso normal. El riesgo principal es el tamaño de los documentos y la seguridad, no la cuota.
