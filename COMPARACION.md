# Comparación y decisiones — 8 de septiembre de 2026

Se comparó la carpeta original `vdouble-juego-main` con el archivo `VDOUBLE-proyecto-v8.zip`. Los originales se conservan. La carpeta `comparativa-v8` es una extracción de consulta. La carpeta `vdouble-definitiva` es la nueva base de desarrollo.

El banco nativo contiene 3.834 palabras distintas y v8 contiene 960. Hay 938 coincidencias exactas de texto; las otras 22 entradas de v8 no se han incorporado automáticamente porque requieren revisar equivalencias y asignar dificultad.

| Área | Proyecto nativo original | ZIP v8 | Nueva base |
| --- | --- | --- | --- |
| Tecnología | React Native, Expo, Android | React web, TanStack, PWA | React Native y Expo |
| Juego local | Sí | Sí | Sí |
| Android | Proyecto Gradle incluido | Sin proyecto Android | Gradle incluido y perfiles EAS |
| Banco de palabras | CSV con dificultad y categorías | Biblioteca propia con categorías | Conserva CSV y selección equilibrada del nativo |
| Revisión del turno | No | Sí | Sí, incluso la última tarjeta, con correcciones reversibles |
| Salas entre móviles | No | Supabase | Pendiente de trasladar |
| Tiempo agotado | Acciones sin comprobación interna del plazo | Validación parcial | Las acciones comprueban el plazo antes de modificar puntos |
| Pasar con dos tarjetas pendientes | Terminaba el turno inmediatamente | Seguimiento de tarjetas pasadas | Termina cuando se pasan todas las pendientes o se agota el tiempo |
| Cambio de ronda | Repetía equipo inicial | Alternaba equipo | Alterna equipo y muestra las instrucciones antes de iniciar el reloj |
| Salida de resultados | Nueva partida | Flujo redundante señalado por el usuario | Volver al inicio |
| Instalación independiente | Referencias `catalog:` sin catálogo y falta de tsconfig | Configuración web propia | Dependencias explícitas, tsconfig y lockfile |

## Reglas aportadas por el usuario

Las capturas se utilizan como referencia de reglas, no como instrucciones operativas ni como diseño que se deba copiar.

- Ronda 1: descripción, intentos ilimitados; no se permiten palabras de la misma familia, palabras que suenen igual, traducciones ni deletreo.
- Ronda 2: una sola palabra como pista y un solo intento por tarjeta.
- Ronda 3: mímica con sonidos y tarareo permitidos, sin palabras. Se interpreta que mantiene el único intento de la ronda anterior.
- Turnos de 30 segundos, revisión de tarjetas antes de confirmar, mismo mazo en tres rondas y siguiente equipo al cambiar de ronda.
- Se mantiene la regla de VDOUBLE/v8: «Pasar / error» resta cinco segundos y conserva la tarjeta. Los aciertos se registran manualmente; la app no escucha ni juzga las pistas.

## Correcciones adicionales

La lógica está separada de React y cuenta con pruebas automáticas. El reloj termina el turno al pasar la app a segundo plano; al restaurar un turno interrumpido se abre la revisión sin regalar otros 30 segundos. Las escrituras de guardado se realizan en orden. La nueva base usa su propia clave de almacenamiento y no importa automáticamente partidas antiguas ni almacenamiento web.

Se retiraron las dependencias no utilizadas, los permisos de ubicación, micrófono y almacenamiento del manifiesto principal y el uso de la firma de depuración para release. Se conserva el identificador Android original para evitar cambiarlo sin decidir la identidad de publicación.

Los archivos de icono del proyecto original no eran PNG válidos. Se sustituyeron por el icono de v8 para la configuración Expo. La marca de las pantallas utiliza ahora Inter Black con mayor tamaño y menor espaciado.

También se detectaron tres imágenes nativas dañadas: un splash de densidad xxxhdpi y dos iconos foreground de xxhdpi/xxxhdpi. Se reemplazaron por las variantes válidas del mismo recurso incluidas en las densidades inferiores. Android puede escalarlas; conviene regenerar todos los recursos con la identidad gráfica final antes de publicar. La comprobación de lectura de las imágenes y del archivo Gradle wrapper pasó después del reemplazo.

## Pendiente antes de considerar cerrada la versión de publicación

- Probar instalación, tamaños de pantalla, interrupciones y una partida completa en un Android real.
- Compilar y firmar la APK; la exportación de Expo genera el bundle y los recursos, no una APK.
- Decidir si las salas de dos móviles deben formar parte de la primera APK. Su código sigue disponible en v8, pero no está integrado en esta base.
- Revisar identidad de publicación y mantener una clave de firma propia para las actualizaciones.

La nueva base no se presenta como una fusión completa de todas las funciones de v8: se ha priorizado el juego local nativo y se ha portado su revisión de turnos.
