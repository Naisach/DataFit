# DataFit: conexión restaurada con Firestore

Esta versión utiliza el proyecto `datafitjac`, la base `(default)` y los documentos existentes de `appState`. Cada documento contiene un campo de texto `json`:

- employees: trabajadores
- inventory: inventario
- matrix: matriz de tallas
- movements: movimientos
- deliveries: entregas
- config: configuración de compras

## Publicar la corrección

1. Extrae este ZIP.
2. Abre la carpeta de tu repositorio clonado con GitHub Desktop. Puedes usar Repository → Show in Explorer.
3. Copia el contenido de `DataFit-main` dentro de esa carpeta, reemplazando los archivos coincidentes. Copia también `.github`, `src`, `tests`, `package.json` y `package-lock.json`. Los archivos que contiene `DataFit-main` deben quedar en la raíz del repositorio, no dentro de una subcarpeta nueva. Conserva la carpeta `.git` del repositorio.
4. En GitHub Desktop revisa Changes, escribe `Restablece conexión con Firestore`, pulsa Commit to main y después Push origin.
5. En GitHub → Actions, espera a que Deploy to Firebase Hosting on merge termine en verde. El flujo usa Node 24, instala las versiones de package-lock.json, ejecuta las pruebas y compila antes de publicar.
6. Abre tu URL habitual y revisa Trabajadores. La aplicación primero recupera los registros de Firestore.

No hace falta volver a ejecutar firebase init. Los flujos conservan el nombre del secreto existente FIREBASE_SERVICE_ACCOUNT_DATAFITJAC.

## Comportamiento de los datos

- La carga inicial y las actualizaciones recibidas de Firestore no generan escrituras.
- Los registros de ejemplo se cargan únicamente cuando se solicita expresamente restablecerlos, con confirmación de que se reemplazarán datos compartidos.
- Un documento ausente no se llena automáticamente con los datos del código.
- Los cambios de una operación se guardan juntos en una transacción. Si otra sesión modificó uno de esos documentos, el guardado se detiene para evitar sobrescribirla.
- La página indica Guardando cambios mientras queda información pendiente. Si falla el guardado, conserva los cambios en memoria y ofrece descargarlos antes de recargar.
- Los nuevos registros ya no dependen del almacenamiento local del navegador. Los datos exclusivamente locales de la versión anterior no se importan automáticamente sobre los registros compartidos.

## Validación

- Compilación de producción: correcta.
- TypeScript: correcto.
- Siete pruebas con datos ficticios: lectura sin escrituras, documento ausente, cambios explícitos, conflicto entre sesiones, JSON inválido, fallo de acceso y edición durante un guardado.
- Lectura del esquema real: 515 trabajadores en appState/employees y campos compatibles. Esta comprobación no realizó escrituras en tu base de datos.
- La versión no fue desplegada desde este entorno: el despliegue se realizará cuando subas estos archivos a GitHub.

## Limitaciones existentes

Las reglas actuales permiten leer y escribir appState a cualquier visitante. El inicio de sesión de la aplicación sigue siendo local y no protege Firestore. La corrección mantiene esas reglas; para restringirlas se requiere integrar Firebase Authentication y definir los usuarios autorizados.

Cada lista continúa guardándose en un único documento como texto JSON. Firestore limita cada documento a 1 MiB; para un mayor volumen será necesario migrar a documentos individuales por trabajador o movimiento.

Las rutas /api del servidor Node.js, incluida la función de análisis de compras, requieren un backend separado para funcionar en Firebase Hosting.
