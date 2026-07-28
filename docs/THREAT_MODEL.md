# Threat Model

## Alcance y activos

El análisis usa STRIDE sobre la app Expo, la API local, SQLite, los tokens QR y la
clave Ed25519. Los activos principales son autenticidad del comprobante,
integridad del snapshot, confidencialidad de la clave privada y exactitud del
estado operativo. Todos los datos de la PoC son ficticios.

## Amenazas

| Threat | Attack scenario | Impact | Mitigation | Residual risk |
| --- | --- | --- | --- | --- |
| Tampering: captura modificada | Cambiar visualmente importe, destino o fecha. | El receptor atribuye un pago inexistente. | Firma Ed25519 del payload canónico; la consulta devuelve datos del emisor. | El receptor puede no escanear. Educación y UX siguen siendo necesarias. |
| Spoofing: QR copiado | Pegar un QR legítimo en un comprobante falso. | Apariencia convincente. | El QR resuelve el registro original minimizado para comparación. | Un contenido falso idéntico al original no es distinguible visualmente, pero tampoco cambia el hecho firmado. |
| Spoofing: receipt ID inventado | Generar UUID y consultar. | Confusión o enumeración. | UUID aleatorio + token de 256 bits; respuesta `NOT_FOUND` genérica. | Metadatos de red y timing requieren endurecimiento adicional. |
| Information disclosure: enumeración | Automatizar consultas sobre IDs. | Descubrimiento de operaciones. | Identificadores no secuenciales, bearer token y rate limit. | El limiter de memoria no coordina varias instancias. |
| Information disclosure: token filtrado | Compartir captura/QR con terceros. | Consulta de importe y estado minimizados. | Data minimization; no se exponen nombres ni cuentas completas. | El QR es transferible. Producción podría usar expiración o consentimiento según el caso. |
| Spoofing: clave privada robada | Extraer PEM del host. | Emisión de firmas fraudulentas válidas. | Permisos de archivo, directorio fuera de Git y separación móvil/servidor. | El host local no ofrece garantías de HSM. Producción debe usar KMS/HSM y rotación. |
| Replay | Reutilizar QR legítimo repetidamente. | Consultas reiteradas o uso engañoso fuera de contexto. | La firma portable conserva datos emitidos y la consulta online, cuando existe, muestra estado actual. | Sin API disponible no puede conocerse una reversión posterior. |
| Spoofing: clave dentro del QR | Incluir una clave del atacante junto a una firma falsa autoconsistente. | El atacante se presenta como emisor. | La app ignora claves aportadas por el QR y resuelve `keyId` contra un registro público fijado. | La rotación exige distribuir de forma confiable el nuevo registro público. |
| Denial of Service: brute force API | Saturar `/api/verify`. | Indisponibilidad local. | Límite por IP, body de 16 KB y validación estricta. | Ataques distribuidos o contra otras rutas requieren WAF/gateway. |
| Elevation of privilege: backend compromise | Obtener ejecución en el proceso. | Acceso a BD y a la clave local. | Dependencias acotadas, Helmet, validación y respuestas sin secretos. | Comprometer el proceso rompe el límite de confianza. Producción separa signing y usa HSM. |
| Tampering: base de datos | Editar importe, fecha, destino, firma o hash en SQLite. | Historial falso. | Verificación reconstruye el payload y comprueba firma y hash. Test automatizado incluido. | Un atacante con BD y clave privada puede refirmar; auditoría inmutable externa es necesaria. |
| Repudiation | Negar creación, verificación o reversión. | Disputa sin trazabilidad. | Eventos locales para creación, firma, verificación, fallo y reversión. | La auditoría SQLite es mutable; producción requiere logs inmutables y sellados. |
| Information disclosure: logs | Registrar tokens o claves por error. | Acceso no autorizado. | Auditoría usa IDs y metadatos permitidos; la clave y tokens no se registran. | Nuevos campos deben pasar revisión de logging. |

## Límites de confianza

El portal de verificación acepta datos hostiles. El simulador de emisor es un
área interna conceptual, pero carece deliberadamente de autenticación en la PoC
local. Nunca debe exponerse tal cual en una red no confiable.
