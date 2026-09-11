# DECABLO — base Android 1.1.0

Esta es la carpeta sobre la que continuar el desarrollo. Consulta `COMPARACION.md` para ver qué se ha incorporado y qué queda pendiente.

## Desarrollo

Requiere Node.js 24 y pnpm 11.19.0. Desde esta carpeta:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run dev
```

`pnpm run generate-word-bank` regenera las tarjetas a partir del CSV incluido. La lógica está en `lib/game.ts`, el guardado en `context/GameContext.tsx` y las pantallas en `app/index.tsx`.

## Verificar el paquete Android

```powershell
pnpm run build
```

Genera JavaScript compilado para Hermes y recursos en `dist`. Esto todavía no produce un archivo APK.

## Compilar APK en Android Studio

1. Instala las dependencias y abre la carpeta `android` en Android Studio.
2. Configura el JDK y descarga el SDK/NDK que pida Gradle. Las rutas de SDK van en `android/local.properties`, un archivo local que no se distribuye.
3. Usa **Build → Generate Signed App Bundle or APK → APK** y selecciona o crea tu clave de firma. El proyecto release no utiliza la clave de depuración.
4. Instala el resultado en un móvil y comprueba una partida completa, las tres instrucciones, revisión, segundo plano y «Volver al inicio».

El identificador Android es `com.vcstudio.games` y el nombre visible es DECABLO.

## Alternativa con EAS

El archivo `eas.json` contiene un perfil `preview` para APK y `production` para AAB. Con EAS CLI instalado, inicia sesión, vincula tu proyecto con `eas build:configure` y usa `eas build --platform android --profile preview`. EAS requiere tu cuenta, conexión y configuración de credenciales. No se ha enviado ninguna compilación a la nube.

## Estado de verificación

TypeScript y las pruebas de reglas se han ejecutado correctamente. También se ha generado el bundle Android con Expo. No se ha compilado ni firmado una APK en este entorno y falta la prueba visual en un dispositivo Android.
